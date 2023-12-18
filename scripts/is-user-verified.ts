/**
 * Is user in group created on-chain?
 * The script runs the check off-chain. Just collecting some info from the Nova chain.
 * So, no gas fees for this.
 *
 * Two approaches followed to check if the user is in the group [From Semaphore docs]:
 * FIXME: [SemaphoreSubgraph] This script is not working as expected. This is because the Semaphore subgraph
 *      may not be configured for Nova network.
 *      Solution: Use `SemaphoreEthers` instead of `SemaphoreSubgraph`.
 *
 * FIXME: [SemaphoreEthers] This script sometimes working, else throws error: "query timeout of 10 seconds exceeded".
 *          Solution: Increase the timeout.
 */

import { SemaphoreSubgraph, SemaphoreEthers } from "@semaphore-protocol/data";
import { ethers } from "hardhat";
import { readContractAddresses, readDidRegistry } from "./utils";
import { Identity } from "@semaphore-protocol/identity";
import { DidRegistry } from "../build/typechain";

// Import the DidRegistry ABI from the JSON file
import DidRegistryJson from "../build/contracts/contracts/DidRegistry.sol/DidRegistry.json";
import { BigNumberish } from "ethers";
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
    const semaphoreAddress: string =
        readContractAddresses(CONFIG_FILE_PATH).Semaphore;

    // client
    const provider = new ethers.providers.JsonRpcProvider(NOVA_RPC_URL);

    // Using `SemaphoreSubgraph`
    // const semaphoreSubgraph = new SemaphoreSubgraph(
    //     "https://nova.squid.gemini-3g.subspace.network/graphql"
    // );

    const didRegistryContract: DidRegistry = new ethers.Contract(
        didRegistryAddress,
        abi,
        provider
    ) as DidRegistry;

    // get the deployedBlockNumber from the contract
    const deployedBlockNumber = await didRegistryContract.deployedBlockNumber();

    // Using `SemaphoreEthers`
    const semaphoreEthers = new SemaphoreEthers(NOVA_RPC_URL, {
        address: semaphoreAddress,
        startBlock: deployedBlockNumber.toNumber(),
    });

    // get the group ID
    const groupId: BigNumberish = await didRegistryContract.groupId();

    // sample user commitment for testing
    let user = new Identity();
    const identityCommitment = user.commitment;

    // using `SemaphoreSubgraph`
    // let isMember = await semaphoreSubgraph.isGroupMember(
    //     groupId.toString(),
    //     identityCommitment.toString()
    // );

    // using `SemaphoreEthers`
    // a. get the group members
    const members = await semaphoreEthers.getGroupMembers(groupId.toString());
    // b. check if the user commitment is present in the group
    let isMember = members.includes(identityCommitment.toString());

    console.log(`Is user with \'${identityCommitment}\' in group? ${isMember}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
