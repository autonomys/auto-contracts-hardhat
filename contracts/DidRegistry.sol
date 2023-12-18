//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./IDidRegistry.sol";

contract DidRegistry {
    IDidRegistry public semaphore;

    uint256 public groupId;

    uint256 public userCount;

    uint256 public deployedBlockNumber;

    address public admin;

    // Events
    // NOTE: This event has been defined instead of relying on `MemberAdded` event in Semaphore contract
    // because the `MemberAdded` event is for multiple groups in Semaphore contract.
    // Hence, we would be able to filter the events for this contract only using `DidAdded` event.
    // This info is required to form the group off-chain and to verify the membership of a user.
    // We could also store (index, commitment) of each user in offchain DB. This would fasten the process
    // skipping the need to filter the events which is a costly operation resource-wise (time & API server cost).
    event DidAdded(uint256 indexed index, uint256 indexed identityCommitment);

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
        admin = msg.sender;

        semaphore.createGroup(groupId, 20, address(this));
    }

    // ======== Getters =========

    function getMerkleTreeRoot() public view returns (uint256) {
        return semaphore.getMerkleTreeRoot(groupId);
    }

    function getMerkleTreeDepth() external view returns (uint256) {
        return semaphore.getMerkleTreeDepth(groupId);
    }

    function getMembers() external view returns (uint256) {
        return semaphore.getNumberOfMerkleTreeLeaves(groupId);
    }

    // ======== Modifiers =========
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    // ======== Setters =========

    /// @dev Set the deployedBlockNumber to the block number from which
    /// the events should be queried.
    function setDeployedBlockNumber(uint256 _deployedBlockNumber) external onlyAdmin {
        deployedBlockNumber = _deployedBlockNumber;
    }

    function addToGroup(uint256 identityCommitment) external {
        if (identityCommitment == 0) {
            revert ZeroIdentityCommitment();
        }

        ++userCount;

        semaphore.addMember(groupId, identityCommitment);

        emit DidAdded(userCount, identityCommitment);
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
