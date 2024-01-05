/**
 * Add/Register a user to a group on Nova using the DID Registry contract
 * Sample tx: {
 *   "0": {
 *     hash: 0x8e61408f673e00e9d1c85607000ff9a6520886516de255ef1a7be3a9ad7292e6,
 *     gas: 1,679,962,
 *   }
 *   "1": {
 *     hash: 0xd7c753be8c70fab590a9b2684f16d107fa15dd63d66fca5308d8f39b4da1bd22,
 *     gas: 903,012,
 *   }
 * }
 *
 * The first tx was costly because it was first used to initialize the corresponding storage like merkleroot.
 * Basically, the 1st member of the group is inserted.
 * Next time onwards, it will be around 900k.
 */
import { ethers } from "hardhat";
import { Wallet, Contract } from "ethers";
import {
    isContractAddress,
    readDidRegistry,
    checkBalance,
    validateEnv,
} from "./utils";
import { Identity } from "@semaphore-protocol/identity";

// Import the DidRegistry ABI from the JSON file
import DidRegistryJson from "../../build/contracts/contracts/DidRegistry.sol/DidRegistry.json";
const abi = DidRegistryJson.abi;

const NOVA_RPC_URL = process.env.NOVA_RPC_URL;
const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY;
// Configurable file path for the deployed contract address
const CONFIG_FILE_PATH = "./deployed-subspace-nova.json"; // Configurable file path

async function main() {
    validateEnv();

    // after running `$ yarn hardhat deploy --network nova`, you can get the DID Registry address
    // from "../deployed-subspace-nova.json".
    const didRegistryAddress: string = readDidRegistry(CONFIG_FILE_PATH)[0];

    // client
    const provider = new ethers.providers.JsonRpcProvider(NOVA_RPC_URL);

    // check if the DID Registry contract address is a contract
    if (!(await isContractAddress(didRegistryAddress, provider))) {
        throw new Error(
            `The address ${didRegistryAddress} is not a valid contract`
        );
    }

    const signer: Wallet = new Wallet(`0x${SIGNER_PRIVATE_KEY}`, provider);
    await checkBalance(signer, provider);

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
        .register(user.commitment);

    // wait for the transaction to be mined
    await tx.wait();

    console.log(`Transaction hash for adding a new user to group: ${tx.hash}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(`An error occurred: ${error}`);
        process.exit(1);
    });
