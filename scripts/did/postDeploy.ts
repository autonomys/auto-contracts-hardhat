/**
 * This script is executed after the deployment of DID Registry is completed.
 * Sample tx: https://nova.subspace.network/tx/0xc86207bb23603ad926e1868b03227570800bf33d7fe5638bcecef7eae6cad5d0
 */

import { ethers } from "hardhat";
import { Wallet } from "ethers";
import {
    isContractAddress,
    readDidRegistry,
    checkBalance,
    validateEnv,
} from "./utils";

// Import the DidRegistry ABI from the JSON file
import DidRegistryJson from "../../build/contracts/contracts/DidRegistry.sol/DidRegistry.json";
import { DidRegistry } from "../../build/typechain";
const abi = DidRegistryJson.abi;

const NOVA_RPC_URL = process.env.NOVA_RPC_URL;
const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY;
// Configurable file path for the deployed contract address
const CONFIG_FILE_PATH = "./deployed-subspace-nova.json"; // Configurable file path

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
    await checkBalance(signer, provider);

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

    // send the transaction to set the deployed block number
    const tx = await didRegistryContract
        .connect(signer)
        .setDeployedBlockNumber(blockNum);

    // wait for the transaction to be mined
    await tx.wait();

    console.log(
        `Transaction hash for setting query from block number ${blockNum}: ${tx.hash}`
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(`An error occurred: ${error}`);
        process.exit(1);
    });
