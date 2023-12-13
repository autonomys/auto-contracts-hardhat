//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";

contract Did {
    ISemaphore public semaphore;

    uint256 public groupId;

    // Errors
    error ZeroAddress();
    error ZeroIdentityCommitment();
    error EitherZeroDidRootNullifierHash();
    error ZeroProof();

    constructor(address semaphoreAddress, uint256 _groupId) {
        if (semaphoreAddress == address(0)) {
            return ZeroAddress();
        }

        semaphore = ISemaphore(semaphoreAddress);
        groupId = _groupId;

        semaphore.createGroup(groupId, 20, address(this));
    }

    function addToGroup(uint256 identityCommitment) external {
        if (identityCommitment == 0) {
            return ZeroIdentityCommitment();
        }

        semaphore.addMember(groupId, identityCommitment);
    }

    function verifyMembership(uint256 did, uint256 merkleTreeRoot, uint256 nullifierHash, uint256[8] calldata proof)
        external
    {
        if (did == 0 || merkleTreeRoot == 0 || nullifierHash == 0) {
            return EitherZeroDidRootNullifierHash();
        }

        for (uint256 i = 0; i < proof.length; i++) {
            if (proof[i] == 0) {
                return ZeroProof();
            }
        }

        semaphore.verifyProof(groupId, merkleTreeRoot, did, nullifierHash, groupId, proof);
    }
}
