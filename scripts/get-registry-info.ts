/**
 * This script gets the group ID of the DID Registry contract deployed on Nova
 */
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { isContractAddress, readDidRegistry } from "./utils";

// Import the DidRegistry ABI from the JSON file
import DidRegistryJson from "../build/contracts/contracts/DidRegistry.sol/DidRegistry.json";
import { DidRegistry } from "../build/typechain";
const abi = DidRegistryJson.abi;

const NOVA_RPC_URL = process.env.NOVA_RPC_URL;
const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY;
// Configurable file path for the deployed contract address
const CONFIG_FILE_PATH = "./deployed-subspace-nova.json";

function validateEnv() {
    if (!SIGNER_PRIVATE_KEY || !NOVA_RPC_URL) {
        throw new Error(
            "SIGNER_PRIVATE_KEY and NOVA_RPC_URL must be set in the .env file"
        );
    }
}

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

    // contract instance
    const didRegistryContract: DidRegistry = new ethers.Contract(
        didRegistryAddress,
        abi,
        provider
    ) as DidRegistry;

    // get the admin
    const admin: string = await didRegistryContract.admin();
    console.log(`Admin: ${admin}`);

    // call the groupId getter function
    const groupId: BigNumber = await didRegistryContract.groupId();
    console.log(`Group ID: ${groupId}`);

    // get the block number when the contract was deployed
    const blockNumber: BigNumber =
        await didRegistryContract.deployedBlockNumber();
    console.log(`Deployed Block number: ${blockNumber}`);

    // call the members getter function
    const members: BigNumber = await didRegistryContract.getMembers();
    console.log(`Total members: ${members}`);

    // call the merkle root getter function
    const merkleRoot: BigNumber = await didRegistryContract.getMerkleTreeRoot();
    console.log(`Merkle root: ${merkleRoot}`);

    const mtDepth: BigNumber = await didRegistryContract.getMerkleTreeDepth();
    console.log(`Merkle tree depth: ${mtDepth}`);
}

main().catch((error) => {
    console.error(`An error occurred: ${error}`);
    process.exit(1);
});
