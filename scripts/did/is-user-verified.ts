/**
 * Is user created in group on-chain?
 * The script runs the check off-chain. Just collecting some info from the Nova chain.
 * So, no gas fees for this.
 *
 * Usage: In order to use any Auto Product, one can use this script to check if the caller is a verified user.
 *
 * Two approaches followed to check if the user is in the group [From Semaphore docs]:
 * FIXME: [SemaphoreSubgraph] This script is not working as expected. This is because the Semaphore subgraph
 *      may not be configured for Nova network. Also, there was no way to feed the Semaphore contract address
 *     to the subgraph. So, it was not able to query the group members maybe.
 *      Solution: Use `SemaphoreEthers` instead of `SemaphoreSubgraph`.
 *
 * FIXME: [SemaphoreEthers] This script sometimes working, else throws error: "query timeout of 10 seconds exceeded".
 *          Solution: Increase the timeout as last resort. As of now, it seems to be working.
 */

import { SemaphoreSubgraph, SemaphoreEthers } from "@semaphore-protocol/data";
import { ethers } from "hardhat";
import { readContractAddresses, readDidRegistry, validateEnv } from "./utils";
import { Identity } from "@semaphore-protocol/identity";
import { DidRegistry } from "../../build/typechain";
import { BigNumberish, BigNumber, Contract } from "ethers";

// Import the DidRegistry ABI from the JSON file
import DidRegistryJson from "../../build/contracts/contracts/DidRegistry.sol/DidRegistry.json";
const abi = DidRegistryJson.abi;

const NOVA_RPC_URL = process.env.NOVA_RPC_URL;
// Configurable file path for the deployed contract address
const CONFIG_FILE_PATH = "./deployed-subspace-nova.json";

async function queryDidAddedEventLogs(
    didRegistryContract: DidRegistry,
    deployedBlockNumber: BigNumber
): Promise<Array<BigNumber>> {
    try {
        // Query the event data
        const filter = didRegistryContract.filters.DidAdded();
        const events = await didRegistryContract.queryFilter(
            filter,
            deployedBlockNumber.toNumber()
        );

        // Process the event data
        const userCommitments: Array<BigNumber> = events.map(
            (event) => event.args.identityCommitment
        );

        return userCommitments;
    } catch (error) {
        throw new Error(`Error querying 'DidAdded' event: ${error}`);
    }
}

// Approach-1
// Using `SemaphoreSubgraph`
// Doc: https://www.notion.so/subspacelabs/Semaphore-61b59172253b4bc88872a8559aafb0ba?pvs=4#fc2880da2cb14d0bb8501f15e793f42d
async function approach1(
    groupId: BigNumberish,
    identityCommitment: bigint
): Promise<boolean> {
    const semaphoreSubgraph = new SemaphoreSubgraph(
        "https://subgraph.satsuma-prod.com/c74ef9357a5b/subspace/semaphore-test/version/v0.0.1-new-version/api"
    );
    // using `SemaphoreSubgraph`
    return await semaphoreSubgraph.isGroupMember(
        groupId.toString(),
        identityCommitment.toString()
    );
}

// Approach-2
// Using `SemaphoreEthers`
// Doc: https://www.notion.so/subspacelabs/Semaphore-61b59172253b4bc88872a8559aafb0ba?pvs=4#1adf19a47b3045d782f6f5d1a5122f7d
async function approach2(
    semaphoreAddress: string,
    deployedBlockNumber: BigNumber,
    groupId: BigNumberish,
    identityCommitment: bigint
): Promise<boolean> {
    // using `SemaphoreEthers`
    const semaphoreEthers = new SemaphoreEthers(NOVA_RPC_URL, {
        address: semaphoreAddress,
        startBlock: deployedBlockNumber.toNumber(),
    });
    // a. get the group members
    const members = await semaphoreEthers.getGroupMembers(groupId.toString());
    // b. check if the user commitment is present in the group
    return members.includes(identityCommitment.toString());
}

async function approach3(
    didRegistryContract: DidRegistry,
    deployedBlockNumber: BigNumber,
    identityCommitment: bigint
): Promise<boolean> {
    // Using query of 'DidAdded' event logs
    const members = (
        await queryDidAddedEventLogs(didRegistryContract, deployedBlockNumber)
    ).map((member) => member.toString());
    return members.includes(identityCommitment.toString());
}

async function main() {
    validateEnv();

    // after running `$ yarn hardhat deploy --network nova`, you can get the DID Registry address
    // from "../deployed-subspace-nova.json".
    const didRegistryAddress: string = readDidRegistry(CONFIG_FILE_PATH)[0];

    // client
    const provider = new ethers.providers.JsonRpcProvider(NOVA_RPC_URL);

    const didRegistryContract: Contract = new ethers.Contract(
        didRegistryAddress,
        abi,
        provider
    );

    // get the group ID
    const groupId: BigNumberish = await didRegistryContract.groupId();

    // sample user commitment for testing
    const user = new Identity();
    const identityCommitment = user.commitment;

    // Approach-1: ✅ 6-9s
    // Currently, fetching from event logs - `MemberAdded` of Semaphore contract.
    // TODO: Need to update the subgraph url to fetch from the event logs of DidRegistry contract - `DidAdded` event.
    // Issue: https://github.com/subspace/auto-contracts-hardhat/issues/2
    const isMember = await approach1(groupId, identityCommitment);

    // get the deployedBlockNumber from the contract
    const deployedBlockNumber = await didRegistryContract.deployedBlockNumber();

    // Approach-2: ✅ 14s (takes more time than Approach-3)
    // const semaphoreAddress: string =
    //     readContractAddresses(CONFIG_FILE_PATH).Semaphore;

    // const isMember = await approach2(
    //     semaphoreAddress,
    //     deployedBlockNumber,
    //     groupId,
    //     identityCommitment
    // );

    // Approach-3: ✅ 8s
    // const isMember = await approach3(
    //     didRegistryContract,
    //     deployedBlockNumber,
    //     identityCommitment
    // );

    console.log(
        `Is user with Auto ID: \'${identityCommitment}\' in group? ${isMember}`
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
