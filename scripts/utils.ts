/**
 * Utility functions
 */

import { ethers } from "ethers";

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
