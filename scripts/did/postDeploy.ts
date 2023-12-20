/**
 * This script is executed after the deployment of DID Registry is completed.
 * Sample tx: https://nova.subspace.network/tx/0x5c177353d872c1b6792bb139e76c4eec366763813987db480ec7b6ce2a4460f6
 */

import { ethers } from "hardhat";
import { Wallet, Contract } from "ethers";
import { isContractAddress, readDidRegistry } from "./utils";

// Import the DidRegistry ABI from the JSON file
import DidRegistryJson from "../../build/contracts/contracts/DidRegistry.sol/DidRegistry.json";
import { assert } from "chai";
import { DidRegistry } from "../../build/typechain";
const abi = DidRegistryJson.abi;

const NOVA_RPC_URL = process.env.NOVA_RPC_URL;
const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY;
// Configurable file path for the deployed contract address
const CONFIG_FILE_PATH = "./deployed-subspace-nova.json"; // Configurable file path
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

async function main() {
    validateEnv();

    // after running `$ yarn hardhat deploy --network nova`, you can get the DID Registry address
    // from "../deployed-subspace-nova.json".
    const [didRegistryAddress, txHash] = readDidRegistry(CONFIG_FILE_PATH);

    // client
    const provider = new ethers.providers.JsonRpcProvider(NOVA_RPC_URL);

    // check if the DID Registry contract address is a contract
    if (!(await isContractAddress(didRegistryAddress, provider))) {
        throw new Error(
            `The address ${didRegistryAddress} is not a valid contract`
        );
    }

    const signer: Wallet = new Wallet(`0x${SIGNER_PRIVATE_KEY}`, provider);
    await checkBalance(signer);

    // instantiate the DID Registry contract instance via the address & provider
    // contract instance
    const didRegistryContract: DidRegistry = new ethers.Contract(
        didRegistryAddress,
        abi,
        provider
    ) as DidRegistry;

    // to be called once by admin
    if ((await didRegistryContract.deployedBlockNumber()).toNumber() !== 0) {
        throw new Error(
            `The deployed block num is already set by the admin of the contract`
        );
    }

    // tx receipt
    const receipt = await provider.getTransactionReceipt(txHash);

    // block number to start query from
    const blockNum = receipt.blockNumber;

    // send the transaction to add the user to the group
    const tx2 = await didRegistryContract
        .connect(signer)
        .setDeployedBlockNumber(blockNum);
    console.log(
        `Transaction hash for setting query from block number ${blockNum}: ${tx2.hash}`
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(`An error occurred: ${error}`);
        process.exit(1);
    });
