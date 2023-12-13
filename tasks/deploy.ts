import { task, types } from "hardhat/config";

task("deploy", "Deploy a Did contract")
    .addOptionalParam(
        "semaphore",
        "Semaphore contract address",
        undefined,
        types.string
    )
    .addOptionalParam("group", "Group id", "111", types.string)
    .addOptionalParam("logs", "Print the logs", true, types.boolean)
    .setAction(
        async (
            { logs, semaphore: semaphoreAddress, group: groupId },
            { ethers, run }
        ) => {
            if (!semaphoreAddress) {
                const { semaphore } = await run("deploy:semaphore", {
                    logs,
                });

                semaphoreAddress = semaphore.address;
            }

            if (!groupId) {
                groupId = process.env.GROUP_ID;
            }

            const DidFactory = await ethers.getContractFactory("Did");

            const didContract = await DidFactory.deploy(
                semaphoreAddress,
                groupId
            );

            await didContract.deployed();

            if (logs) {
                console.info(
                    `Did contract has been deployed to: ${didContract.address}`
                );
            }

            return didContract;
        }
    );
