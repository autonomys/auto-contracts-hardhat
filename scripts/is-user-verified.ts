/**
 * Is user in group created on-chain?
 * The script runs the check off-chain. Just collecting some info from the Nova chain.
 * So, no gas fees for this.
 *
 * FIXME: This script is not working as expected. This is because the Semaphore subgraph
 *      may not be configured for Nova network.
 */

import { SemaphoreSubgraph } from "@semaphore-protocol/data";
import { ethers } from "hardhat";
import { readContractAddress } from "./utils";
import { Identity } from "@semaphore-protocol/identity";
import { DidRegistry } from "../build/typechain";

// Import the DidRegistry ABI from the JSON file
import DidRegistryJson from "../build/contracts/contracts/DidRegistry.sol/DidRegistry.json";
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
    const didRegistryAddress: string = readContractAddress(CONFIG_FILE_PATH);

    // client
    const provider = new ethers.providers.JsonRpcProvider(NOVA_RPC_URL);

    const semaphoreSubgraph = new SemaphoreSubgraph(
        "https://nova.squid.gemini-3g.subspace.network/graphql"
    );

    const didRegistryContract = new ethers.Contract(
        didRegistryAddress,
        abi,
        provider
    ) as DidRegistry;

    // get the group ID
    const groupId = await didRegistryContract.groupId();
    console.log(`Group ID: ${groupId}`);

    // sample user commitment for testing
    let user = new Identity();
    const identityCommitment = user.commitment;

    let isMember = await semaphoreSubgraph.isGroupMember(
        groupId.toString(),
        identityCommitment.toString()
    );
    console.log(`Is user ${identityCommitment} in group? ${isMember}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
