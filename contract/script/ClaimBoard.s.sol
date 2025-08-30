// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {ClaimBoard} from "../src/ClaimBoard.sol";

contract ClaimBoardScript is Script {
    ClaimBoard public claimBoard;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        claimBoard = new ClaimBoard();

        vm.stopBroadcast();
    }
}
