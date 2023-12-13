import { ethers } from "hardhat";
import { Wallet, ContractFactory } from "ethers";
import { Did } from "../build/typechain";
import { isContractAddress } from "./utils";

// after running `yarn hardhat deploy --network nova`, you can get the DID contract address from the console
// taken from "../deployed-subspace-nova.json"
const DID_CONTRACT_ADDRESS = "0x63cF1da0CA33787Ef23a9D4878CF2eeb33776906";

async function main() {
    const privateKey = process.env.ETHEREUM_PRIVATE_KEY;
    const novaRpcUrl = process.env.NOVA_RPC_URL;

    if (!privateKey || !novaRpcUrl) {
        throw new Error(
            "ETHEREUM_PRIVATE_KEY and NOVA_RPC_URL must be set in the .env file"
        );
    }

    const provider = new ethers.providers.JsonRpcProvider(novaRpcUrl);

    // check if the DID contract address is a contract
    if (!(await isContractAddress(DID_CONTRACT_ADDRESS, provider))) {
        throw new Error(
            `The address ${DID_CONTRACT_ADDRESS} is not a valid contract`
        );
    }

    const signer: Wallet = new Wallet(`0x${privateKey}`, provider);

    const didContractFactory: ContractFactory = await ethers.getContractFactory(
        "Did",
        signer
    );
    // AuctionFactory = await ethers.getContractFactory("Auction");
    // instantiate the DID contract instance via the address & provider
    let didContract: Did = (await didContractFactory.attach(
        DID_CONTRACT_ADDRESS
    )) as Did;

    // call the groupId getter function
    const groupId = await didContract.groupId();
    console.log(`Group ID: ${groupId}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
