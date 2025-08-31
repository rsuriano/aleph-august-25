// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {ClaimBoard} from "../src/ClaimBoard.sol";

contract DeployClaimBoard is Script {
    function run() external returns (ClaimBoard) {
        vm.startBroadcast();
        
        ClaimBoard claimBoard = new ClaimBoard();
        
        console.log("ClaimBoard deployed at:", address(claimBoard));
        
        vm.stopBroadcast();
        
        return claimBoard;
    }
} 