/**
 * Add a user to a group on Nova using the DID Registry contract
 * Gas: 902,923
 * Sample tx: https://nova.subspace.network/tx/0xec23bed2eadb6c153dd5cde464614f110c20206747e2431abaa28d71ac1f82eb
 */
import { ethers } from "hardhat";
import { Wallet, ContractFactory, Contract } from "ethers";
import { isContractAddress, readContractAddresses } from "./utils";

// Import the DidRegistry ABI from the JSON file
import DidRegistryJson from "../build/contracts/contracts/DidRegistry.sol/DidRegistry.json";
import { Identity } from "@semaphore-protocol/identity";
const abi = DidRegistryJson.abi;

const NOVA_RPC_URL = process.env.NOVA_RPC_URL;
const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY;
// Configurable file path for the deployed contract address
const CONFIG_FILE_PATH = "./deployed-subspace-nova.json"; // Configurable file path
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

    // after running `$ yarn hardhat deploy --network nova`, you can get the DID Registry address
    // from "../deployed-subspace-nova.json".
    const didRegistryAddress: string =
        readContractAddresses(CONFIG_FILE_PATH).DidRegistry;

    // client
    const provider = new ethers.providers.JsonRpcProvider(NOVA_RPC_URL);

    // check if the DID Registry contract address is a contract
    if (!(await isContractAddress(didRegistryAddress, provider))) {
        throw new Error(
            `The address ${didRegistryAddress} is not a valid contract`
        );
    }

    const signer: Wallet = new Wallet(`0x${SIGNER_PRIVATE_KEY}`, provider);
    await checkBalance(signer);

    // instantiate the DID Registry contract instance via the address & provider
    // contract instance
    const didRegistryContract: Contract = new ethers.Contract(
        didRegistryAddress,
        abi,
        provider
    );

    // create a new user & get the identity commitment
    const user = new Identity();

    // send the transaction to add the user to the group
    const tx = await didRegistryContract
        .connect(signer)
        .addToGroup(user.commitment);
    console.log(`Transaction hash for adding a new user to group: ${tx.hash}`);
}

main().catch((error) => {
    console.error(`An error occurred: ${error}`);
    process.exit(1);
});
