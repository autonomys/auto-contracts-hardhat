/**
 * This script gets the group ID of the DID Registry contract deployed on Nova
 */
import { ethers } from "hardhat";
import { Wallet, ContractFactory } from "ethers";
import { DidRegistry } from "../build/typechain";
import { isContractAddress, readContractAddress } from "./utils";

const NOVA_RPC_URL = process.env.NOVA_RPC_URL;
const ETHEREUM_PRIVATE_KEY = process.env.ETHEREUM_PRIVATE_KEY;
const CONFIG_FILE_PATH = "./deployed-subspace-nova.json"; // Configurable file path

function validateEnv() {
    if (!ETHEREUM_PRIVATE_KEY || !NOVA_RPC_URL) {
        throw new Error(
            "ETHEREUM_PRIVATE_KEY and NOVA_RPC_URL must be set in the .env file"
        );
    }
}

async function main() {
    validateEnv();

    // after running `$ yarn hardhat deploy --network nova`, you can get the DID Registry address
    // from "../deployed-subspace-nova.json".
    const didRegistryAddress: string = readContractAddress(CONFIG_FILE_PATH);

    const provider = new ethers.providers.JsonRpcProvider(NOVA_RPC_URL);

    // check if the DID Registry contract address is a contract
    if (!(await isContractAddress(didRegistryAddress, provider))) {
        throw new Error(
            `The address ${didRegistryAddress} is not a valid contract`
        );
    }

    const signer: Wallet = new Wallet(`0x${ETHEREUM_PRIVATE_KEY}`, provider);

    const didContractFactory: ContractFactory = await ethers.getContractFactory(
        "DidRegistry",
        signer
    );

    // instantiate the DID Registry contract instance via the address & provider
    const didContract: DidRegistry = (await didContractFactory.attach(
        didRegistryAddress
    )) as DidRegistry;

    // call the groupId getter function
    const groupId = await didContract.groupId();
    console.log(`Group ID: ${groupId}`);
}

main().catch((error) => {
    console.error(`An error occurred: ${error}`);
    process.exit(1);
});