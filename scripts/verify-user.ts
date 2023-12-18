/**
 * Verify user is in a group on Nova using the DID Registry contract
 */
import { ethers } from "hardhat";
import { Wallet, Contract, BigNumberish, BigNumber } from "ethers";
import { DidRegistry } from "../build/typechain";
import {
    isContractAddress,
    readContractAddresses,
    readDidRegistry,
} from "./utils";
import { formatBytes32String } from "ethers/lib/utils";
import { config } from "../package.json";
import { now } from "../scripts/utils";
import { Identity } from "@semaphore-protocol/identity";
import { generateProof } from "@semaphore-protocol/proof";
import { Group } from "@semaphore-protocol/group";
import { debug } from "debug";

// Import the DidRegistry ABI from the JSON file
import DidRegistryJson from "../build/contracts/contracts/DidRegistry.sol/DidRegistry.json";
const abi = DidRegistryJson.abi;

const NOVA_RPC_URL = process.env.NOVA_RPC_URL;
const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY;
// Configurable file path for the deployed contract address
const CONFIG_FILE_PATH = "./deployed-subspace-nova.json";
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

async function queryDidAddedEvent(
    didRegistryContract: DidRegistry
): Promise<Array<BigNumber>> {
    let userCommitments: Array<BigNumber> = [];
    try {
        // Create a contract instance
        // const contract = new ethers.Contract(contractAddress, abi, provider);

        // Query the event data
        const filter = didRegistryContract.filters.DidAdded();
        const events = await didRegistryContract.queryFilter(filter, 1000);

        // Process the event data
        events.forEach((event) => {
            console.log(`Index: ${event.args.index}`);
            console.log(
                `Identity Commitment: ${event.args.identityCommitment}`
            );

            userCommitments.push(event.args.identityCommitment);
        });

        return userCommitments;
    } catch (error) {
        throw new Error(`Error querying 'DidAdded' event: ${error}`);
    }
}

// create a group forming a tree with all the users including the new user
async function formGroup(
    didRegistryContract: Contract,
    newUser: Identity
): Promise<Group> {
    try {
        // get the group id
        const groupId = await didRegistryContract.groupId();

        // create a group
        const group = new Group(groupId.toString());

        // TODO: query the blockchain to get the list of users commitment by filtering event logs
        // TODO: We could store the array of users commitment in external DB for faster merkle proof generation
        let userCommitments: Array<BigNumberish> = await queryDidAddedEvent(
            didRegistryContract as DidRegistry
        );

        // add the new user to the array
        userCommitments.push(newUser.commitment);

        // add the users (commitment) to the group
        for (const uc in userCommitments) {
            group.addMember(uc);
        }

        // total members in the group
        console.log("Total members in the group: ", group.members.length);

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
    await checkBalance(signer);

    dbg(`Signer address: ${signer.address}`);
    // contract instance
    const didRegistryContract: Contract = new ethers.Contract(
        didRegistryAddress,
        abi,
        provider
    );

    dbg(`DID Registry address: ${didRegistryContract.address}`);

    // new user
    const newUser = new Identity();

    // signer sends tx to add the new user to the group (tree)
    const tx1 = await didRegistryContract
        .connect(signer)
        .addToGroup(newUser.commitment);
    console.log(`Transaction hash for adding user to group: ${tx1.hash}`);

    // snark artifacts
    const wasmFilePath = `${config.paths.build["snark-artifacts"]}/semaphore.wasm`;
    const zkeyFilePath = `${config.paths.build["snark-artifacts"]}/semaphore.zkey`;

    // signal
    const did = formatBytes32String(`Auto DID${now()}`);

    // get the formed group (tree) with all the users including the new user
    const group = await formGroup(didRegistryContract, newUser);

    const groupId = await didRegistryContract.groupId();

    const fullProof = await generateProof(newUser, group, groupId, did, {
        wasmFilePath,
        zkeyFilePath,
    });

    // signer sends tx to verify the new user
    const tx2 = await didRegistryContract
        .connect(signer)
        .verifyMembership(
            did,
            fullProof.merkleTreeRoot,
            fullProof.nullifierHash,
            fullProof.proof
        );
    console.log(`Transaction hash for verifying the new user: ${tx2.hash}`);
}

main().catch((error) => {
    console.error(`An error occurred: ${error}`);
    process.exit(1);
});
