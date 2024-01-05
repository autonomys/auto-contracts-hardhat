/**
 * Verify onchain, if a user is verified (i.e. present in a group) on the DID Registry contract deployed on Nova.
 *
 * To fetch the members (index, commitment) to form group from the `DidAdded` event logs on Nova chain,
 * we need to query the event logs starting from the block number where the contract was deployed.
 * We can get the block number when the contract was deployed using the `deployedBlockNumber` getter function
 * of DID Registry contract.
 *
 * Semaphore (`@semaphore-protocol/data`) offers 2 ways to fetch members from its `MemberAdded` event logs:
 *   1. Subgraph: using `SemaphoreSubgraph` class
 *   2. RPC: using `SemaphoreEthers` class
 *
 * NOTE: As per the `is-user-verified.ts` script, verification can be done offchain.
 *
 * The most optimized approach is to query a custom `DidAdded` event log of the DID Registry contract (meant for a single group),
 * which would return the list of users commitment. Using this we can form a group (tree) with all the members.
 * This approach is considered as optimized as this would only query the events of a single group instead of `MemberAdded`
 * event logs of all the groups, which is the case with `@semaphore-protocol/data` approach. This queries the event logs
 * from the block number when the Semaphore contract was deployed. This Semaphore contract can have multiple groups openly.
 */
import { ethers } from "hardhat";
import { Wallet, BigNumberish, BigNumber } from "ethers";
import { DidRegistry } from "../../build/typechain";
import {
    isContractAddress,
    readDidRegistry,
    now,
    checkBalance,
    validateEnv,
} from "./utils";
import { formatBytes32String } from "ethers/lib/utils";
import { config } from "../../package.json";
import { Identity } from "@semaphore-protocol/identity";
import { generateProof } from "@semaphore-protocol/proof";
import { Group } from "@semaphore-protocol/group";
import { debug } from "debug";

// Import the DidRegistry ABI from the JSON file
import DidRegistryJson from "../../build/contracts/contracts/DidRegistry.sol/DidRegistry.json";
const abi = DidRegistryJson.abi;

const NOVA_RPC_URL = process.env.NOVA_RPC_URL;
const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY;
// Configurable file path for the deployed contract address
const CONFIG_FILE_PATH = "./deployed-subspace-nova.json";

async function queryDidAddedEventLogs(
    didRegistryContract: DidRegistry
): Promise<Array<BigNumber>> {
    let userCommitments: Array<BigNumber> = [];
    try {
        // fetch the block number when the contract was deployed
        const deployedBlockNumber =
            await didRegistryContract.deployedBlockNumber();

        // Query the event data
        const filter = didRegistryContract.filters.DidAdded();
        const events = await didRegistryContract.queryFilter(
            filter,
            deployedBlockNumber.toNumber()
        );

        // Process the event data
        events.forEach((event) => {
            userCommitments.push(event.args.identityCommitment);
        });

        return userCommitments;
    } catch (error) {
        throw new Error(`Error querying 'DidAdded' event: ${error}`);
    }
}

// create a group forming a tree with all the users including the new user
async function formGroup(
    didRegistryContract: DidRegistry,
    newUser: Identity
): Promise<Group> {
    try {
        // get the group id
        const groupId = await didRegistryContract.groupId();

        // create a group
        const group = new Group(groupId.toString());

        // query the blockchain to get the list of users commitment by filtering event logs
        // TODO: We could store the array of users commitment in external DB for faster merkle proof generation
        let userCommitments: Array<BigNumberish> = await queryDidAddedEventLogs(
            didRegistryContract as DidRegistry
        );

        // Although the new user is added to the group on-chain before this step.
        // But, it is not included in the event logs. So, we need to add it manually.
        // NOTE: Plausible reason: May be the block is not finalized. So, the event logs doesn't include the new user.
        userCommitments.push(newUser.commitment);

        // log the users commitment array including the new user
        console.log("[");

        // add the users (commitment) to the group
        userCommitments.forEach((uc) => {
            console.log(`  ${uc}`);
            group.addMember(uc.toString());
        });
        console.log("]");

        // CLEANUP: Remove later.
        // NOTE: It has been observed that when querying the event logs, sometimes the new user is not included.
        // That's why this assertion:
        // assert.strictEqual(
        //     group.members.length,
        //     (await didRegistryContract.getMembers()).toNumber(),
        //     "Actual members in the group is not equal to the expected members because the event logs query failed to include the new user. Please try verifying the latest user after 10s maybe."
        // );

        // total members in the group
        console.log(
            "Total members in the group (including the NEW one): ",
            group.members.length
        );

        return group;
    } catch (error) {
        throw new Error(`Error forming group: ${error}`);
    }
}

async function main() {
    // Usage:
    // $ DEBUG=verify-user  yarn verify-user
    let dbg = debug("verify-user");

    validateEnv();
    dbg(`env validated`);

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

    // Get the signer & check if it has sufficient balance to send transactions
    const signer: Wallet = new Wallet(`0x${SIGNER_PRIVATE_KEY}`, provider);
    await checkBalance(signer, provider);

    dbg(`Signer address: ${signer.address}`);
    // contract instance
    const didRegistryContract: DidRegistry = new ethers.Contract(
        didRegistryAddress,
        abi,
        provider
    ) as DidRegistry;

    dbg(`DID Registry address: ${didRegistryContract.address}`);

    // sample (random) new user for testing purpose. In production,
    // the given user would be generated by the client
    // from the recovered seed phrase
    const newUser = new Identity();

    // signer sends tx to add the new user to the group (tree)
    const tx1 = await didRegistryContract
        .connect(signer)
        .register(newUser.commitment);

    // wait for the transaction to be mined
    await tx1.wait();

    console.log(`Transaction hash for adding a new user to group: ${tx1.hash}`);

    console.log(`Identity Commitment (NEW): ${newUser.commitment}`);

    // snark artifacts
    const wasmFilePath = `${config.paths.build["snark-artifacts"]}/semaphore.wasm`;
    const zkeyFilePath = `${config.paths.build["snark-artifacts"]}/semaphore.zkey`;

    // external nullifier
    const externalNullifier = formatBytes32String("DID");

    // signal
    const signal = formatBytes32String(`Auto DID${now()}`);

    // get the formed group (tree) with all the users including the new user
    const group = await formGroup(didRegistryContract, newUser);

    // as external nullifier
    // const groupId = await didRegistryContract.groupId();

    const fullProof = await generateProof(
        newUser,
        group,
        externalNullifier,
        signal,
        {
            wasmFilePath,
            zkeyFilePath,
        }
    );

    dbg(`Sending tx to verify the new user...`);

    // signer sends tx to verify the new user
    // FIXME: It fails with 'failed' status. But, the tx is successful.
    const tx2 = await didRegistryContract
        .connect(signer)
        .verifyMembership(
            signal,
            fullProof.merkleTreeRoot,
            fullProof.nullifierHash,
            fullProof.proof,
            { gasLimit: 2000000 }
        );

    // wait for the transaction to be mined
    await tx2.wait();

    console.log(`Transaction hash for verifying the new user: ${tx2.hash}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(`An error occurred: ${error}`);
        process.exit(1);
    });
