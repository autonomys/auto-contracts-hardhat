/**
 * Pay module
 */

import { ethers, Wallet } from "ethers";

const NOVA_RPC_URL = process.env.NOVA_RPC_URL;
const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY;
const MIN_BALANCE_SIGNER = "0.01";

function validateEnv() {
    if (!SIGNER_PRIVATE_KEY || !NOVA_RPC_URL) {
        throw new Error(
            "SIGNER_PRIVATE_KEY and NOVA_RPC_URL must be set in the .env file"
        );
    }
}

async function checkBalance(signer: Wallet) {
    // check if sufficient balance is available
    if (
        (await signer.getBalance()).lt(
            ethers.utils.parseEther(MIN_BALANCE_SIGNER)
        )
    ) {
        throw new Error(
            `The address ${signer.address} does not have sufficient balance to send transactions`
        );
    }
}

async function main() {
    validateEnv();

    // client
    const provider = new ethers.providers.JsonRpcProvider(NOVA_RPC_URL);

    // get the sender (signer) address
    const signer: Wallet = new Wallet(`0x${SIGNER_PRIVATE_KEY}`, provider);
    await checkBalance(signer);

    // transfer '0.1 TSSC' to the receiver address
    const tx = await signer.sendTransaction({
        to: "0x1D1cf575Cc0A8988fA274D36018712dA4632FbDD",
        value: ethers.utils.parseEther("0.1"),
    });

    // print the tx hash if successful
    console.log(`Transaction hash: ${tx.hash}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
