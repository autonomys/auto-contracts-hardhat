//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";
import "@semaphore-protocol/contracts/interfaces/ISemaphoreGroups.sol";

/// @title Semaphore contract interface.
interface IDidRegistry is ISemaphore, ISemaphoreGroups {}
