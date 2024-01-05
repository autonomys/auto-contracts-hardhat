/**
 * Pay on Nova chain
 */

import { ethers, BigNumber } from "ethers";

const NOVA_RPC_URL = process.env.NOVA_RPC_URL;
const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY;

function validateEnv() {
    if (!SIGNER_PRIVATE_KEY || !NOVA_RPC_URL) {
        throw new Error(
            "SIGNER_PRIVATE_KEY and NOVA_RPC_URL must be set in the .env file"
        );
    }
}

async function pay(
    recipient: string,
    amount: BigNumber,
    sender?: ethers.Signer
): Promise<string> {
    // provider/client
    const provider = new ethers.providers.JsonRpcProvider(NOVA_RPC_URL);

    // get the signer if available
    sender = sender || new ethers.Wallet(`0x${SIGNER_PRIVATE_KEY}`, provider);

    // Get the balance of the signer
    const balance = await sender.getBalance();

    const gasPrice = await provider.getGasPrice();

    // Check if the signer has enough balance including required gas
    if (balance.lt(amount.add(gasPrice.mul(21000)))) {
        throw new Error("Insufficient balance");
    }

    // Send the transaction
    const tx = await sender.sendTransaction({
        to: recipient,
        value: amount,
    });

    // Wait for the transaction to be mined
    await tx.wait();

    // Return the transaction hash
    return tx.hash;
}

async function main() {
    validateEnv();

    const txHash = await pay(
        "0x1D1cf575Cc0A8988fA274D36018712dA4632FbDD",
        ethers.utils.parseEther("0.1")
    );
    console.log(`Transaction hash: ${txHash}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
