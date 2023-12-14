import download from "download"
import fs from "fs"
import { config } from "../package.json"

async function main() {
    const treeDepth = process.env.TREE_DEPTH || 20;
    const snarkArtifactsPath = config.paths.build["snark-artifacts"]
    const url = `http://www.trusted-setup-pse.org/semaphore/${treeDepth}`

    if (!fs.existsSync(snarkArtifactsPath)) {
        fs.mkdirSync(snarkArtifactsPath, { recursive: true })
    }

    if (!fs.existsSync(`${snarkArtifactsPath}/semaphore.zkey`)) {
        await download(`${url}/semaphore.wasm`, snarkArtifactsPath)
        await download(`${url}/semaphore.zkey`, snarkArtifactsPath)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
