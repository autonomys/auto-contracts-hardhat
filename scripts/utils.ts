/**
 * Utility functions
 */

import { ethers } from "ethers";
import { ethers as ethersHardhat } from "hardhat";
import { readFileSync } from "fs";

/**
 * Checks if the given address is a contract address.
 * @param address - The address to check.
 * @param provider - The ethers provider to use for checking the code.
 * @returns A promise that resolves to a boolean indicating whether the address is a contract.
 */
export async function isContractAddress(
    address: string,
    provider: ethers.providers.Provider
): Promise<boolean> {
    // Check if the address is well-formed
    if (!ethers.utils.isAddress(address)) {
        return false;
    }

    // Check if the address is a contract (has associated code)
    const code = await provider.getCode(address);
    return code !== "0x"; // if code is '0x', it's an EOA (Externally Owned Account), not a contract
}

/**
 * Represents the contract addresses.
 */
interface ContractAddresses {
    Pairing: string;
    SemaphoreVerifier: string;
    Poseidon: string;
    IncrementalBinaryTree: string;
    Semaphore: string;
    DidRegistry: string;
}

/**
 * Reads the contract address from a JSON file.
 *
 * @param filePath - The path to the JSON file.
 * @returns The contract address as string.
 * @throws Error if there is an error reading the JSON file.
 */
export function readContractAddress(filePath: string): string {
    try {
        const rawData = readFileSync(filePath, { encoding: "utf8" });
        const data: ContractAddresses = JSON.parse(rawData);
        return data.DidRegistry;
    } catch (error) {
        console.error("Error reading the JSON file:", error);
        throw error; // or handle the error as you see fit
    }
}

/**
 * Retrieves the current timestamp of the latest block.
 * @returns A Promise that resolves to the current block timestamp.
 */
export async function now(): Promise<number> {
    return (
        await ethersHardhat.provider.getBlock(
            await ethersHardhat.provider.getBlockNumber()
        )
    ).timestamp;
}
