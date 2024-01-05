/**
 * This is to deploy the DID Registry contract using the deployed Semaphore contract.
 */
import { task, types } from "hardhat/config";
import { readFileSync } from "fs";

interface ContractAddresses {
    Pairing: string;
    SemaphoreVerifier: string;
    Poseidon: string;
    IncrementalBinaryTree: string;
    Semaphore: string;
    DidRegistry: {
        address: string;
        txHash: string;
    };
}

export function readContractAddresses(filePath: string): ContractAddresses {
    try {
        const rawData = readFileSync(filePath, { encoding: "utf8" });
        const data: ContractAddresses = JSON.parse(rawData);
        return data;
    } catch (error) {
        throw new Error(
            `Error reading the JSON file for Semaphore addresses: ${error}`
        );
    }
}

task("deployDidRegistry", "Deploy a DidRegistry contract")
    .addOptionalParam("group", "Group id", "111", types.string)
    .addOptionalParam("logs", "Print the logs", true, types.boolean)
    .setAction(async ({ logs, group: groupId }, { ethers }) => {
        // Configurable file path for the deployed contract addresses
        const CONFIG_FILE_PATH = "./deployed-subspace-nova.json";

        const semaphoreAddress: string =
            readContractAddresses(CONFIG_FILE_PATH).Semaphore;

        if (!groupId) {
            groupId = process.env.GROUP_ID;
        }

        const DidFactory = await ethers.getContractFactory("DidRegistry");

        const didContract = await DidFactory.deploy(semaphoreAddress, groupId);

        await didContract.deployed();

        if (logs) {
            console.info(
                `DidRegistry contract has been deployed to: ${didContract.address} at tx hash: ${didContract.deployTransaction.hash}`
            );
        }

        return didContract;
    });
