//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./IDidRegistry.sol";

contract DidRegistry {
    IDidRegistry public semaphore;

    uint256 public groupId;

    // Errors
    error ZeroAddress();
    error ZeroIdentityCommitment();
    error EitherZeroDidRootNullifierHash();
    error ZeroProof();

    constructor(address semaphoreAddress, uint256 _groupId) {
        if (semaphoreAddress == address(0)) {
            revert ZeroAddress();
        }

        semaphore = IDidRegistry(semaphoreAddress);
        groupId = _groupId;

        semaphore.createGroup(groupId, 20, address(this));
    }

    // ======== Getters =========

    function getMerkleTreeRoot() public view returns (uint256) {
        return semaphore.getMerkleTreeRoot(groupId);
    }

    function getMerkleTreeDepth() external view returns (uint256) {
        return semaphore.getMerkleTreeDepth(groupId);
    }

    // ======== Setters =========

    function addToGroup(uint256 identityCommitment) external {
        if (identityCommitment == 0) {
            revert ZeroIdentityCommitment();
        }

        semaphore.addMember(groupId, identityCommitment);
    }

    function verifyMembership(uint256 did, uint256 merkleTreeRoot, uint256 nullifierHash, uint256[8] calldata proof)
        external
    {
        if (did == 0 || merkleTreeRoot == 0 || nullifierHash == 0) {
            revert EitherZeroDidRootNullifierHash();
        }

        for (uint256 i = 0; i < proof.length; i++) {
            if (proof[i] == 0) {
                revert ZeroProof();
            }
        }

        semaphore.verifyProof(groupId, merkleTreeRoot, did, nullifierHash, groupId, proof);
    }
}
