import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import { generateProof } from "@semaphore-protocol/proof";
import { expect } from "chai";
import { formatBytes32String } from "ethers/lib/utils";
import { run } from "hardhat";
// @ts-ignore: typechain folder will be generated after contracts compilation
import { DidRegistry } from "../build/typechain";
import { config } from "../package.json";
import { now } from "../scripts/did/utils";

describe("DidRegistry", () => {
    let didContract: DidRegistry;
    let semaphoreContract: string;

    const groupId = "111";
    const group = new Group(groupId);
    const users: Identity[] = [];

    before(async () => {
        const { semaphore } = await run("deploy:semaphore", {
            logs: false,
        });

        didContract = await run("deploy", {
            logs: false,
            group: groupId,
            semaphore: semaphore.address,
        });
        semaphoreContract = semaphore;

        users.push(new Identity());
        users.push(new Identity());
    });

    describe("# register", () => {
        it("Should allow users to join the group", async () => {
            for await (const [i, user] of users.entries()) {
                const transaction = didContract.register(user.commitment);

                group.addMember(user.commitment);

                await expect(transaction)
                    .to.emit(semaphoreContract, "MemberAdded")
                    .withArgs(groupId, i, user.commitment, group.root);
            }
        });

        // TODO: Add more tests for covering the failure cases
    });

    describe("# verifyMembership", () => {
        const wasmFilePath = `${config.paths.build["snark-artifacts"]}/semaphore.wasm`;
        const zkeyFilePath = `${config.paths.build["snark-artifacts"]}/semaphore.zkey`;

        it("Should allow users to send did anonymously", async () => {
            const did = formatBytes32String(`Auto DID${now()}`);

            const fullProof = await generateProof(
                users[1],
                group,
                groupId,
                did,
                {
                    wasmFilePath,
                    zkeyFilePath,
                }
            );

            const transaction = didContract.verifyMembership(
                did,
                fullProof.merkleTreeRoot,
                fullProof.nullifierHash,
                fullProof.proof
            );

            await expect(transaction)
                .to.emit(semaphoreContract, "ProofVerified")
                .withArgs(
                    groupId,
                    fullProof.merkleTreeRoot,
                    fullProof.nullifierHash,
                    groupId,
                    fullProof.signal
                );
        });

        // TODO: Add more tests for covering the failure cases
    });
});
