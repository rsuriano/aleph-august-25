// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {ClaimBoard} from "../src/ClaimBoard.sol";

contract ClaimBoardAddressesTest is Test {
    ClaimBoard public claimBoard;
    
    address constant FROM_ADDR = 0xD1C157CbF1a0ce6064ad9F733261364E1ED8fc66;
    address constant TO_ADDR = 0x08d2b0a37F869FF76BACB5Bab3278E26ab7067B7;
    uint256 constant AMOUNT = 100000000000000; // 0.0001 ETH
    uint16 constant SOURCE_CHAIN_ID = 1;
    uint32 constant MIN_CONFS = 2;
    uint32 constant EXPIRATION_MINUTES = 60;
    uint256 constant BOUNTY = 0.001 ether;

    function setUp() public {
        claimBoard = new ClaimBoard();
    }

    function testAddressesStoredCorrectly() public {
        console.log("=== Testing Address Storage ===");
        console.log("FROM_ADDR:", FROM_ADDR);
        console.log("TO_ADDR:", TO_ADDR);
        
        // Post a claim
        bytes32 claimId = claimBoard.postClaim{value: BOUNTY}(
            SOURCE_CHAIN_ID,
            FROM_ADDR,
            TO_ADDR,
            AMOUNT,
            MIN_CONFS,
            EXPIRATION_MINUTES
        );
        
        console.log("Created claim ID:", vm.toString(claimId));
        
        // Get the claim back
        ClaimBoard.Claim memory claim = claimBoard.getClaim(claimId);
        
        console.log("Stored fromAddr:", claim.fromAddr);
        console.log("Stored toAddr:", claim.toAddr);
        
        // Verify addresses match
        assertEq(claim.fromAddr, FROM_ADDR, "From address should match");
        assertEq(claim.toAddr, TO_ADDR, "To address should match");
        assertEq(claim.amount, AMOUNT, "Amount should match");
        assertEq(claim.sourceChainId, SOURCE_CHAIN_ID, "Source chain ID should match");
        assertEq(claim.minConfs, MIN_CONFS, "Min confirmations should match");
        assertEq(claim.poster, address(this), "Poster should be this contract");
        assertEq(claim.bounty, BOUNTY, "Bounty should match");
        
        console.log("All address checks passed!");
    }
    
    function testGetClaimByIndex() public {
        console.log("=== Testing getClaimByIndex ===");
        
        // Post a claim
        bytes32 claimId = claimBoard.postClaim{value: BOUNTY}(
            SOURCE_CHAIN_ID,
            FROM_ADDR,
            TO_ADDR,
            AMOUNT,
            MIN_CONFS,
            EXPIRATION_MINUTES
        );
        
        // Get claim by index
        (
            bytes32 returnedClaimId,
            address poster,
            uint256 amount,
            uint256 bounty,
            uint8 status,
            uint64 deadline,
            uint16 sourceChainId,
            address fromAddr,
            address toAddr,
            uint32 minConfs
        ) = claimBoard.getClaimByIndex(0);
        
        console.log("Index 0 fromAddr:", fromAddr);
        console.log("Index 0 toAddr:", toAddr);
        
        // Verify addresses match
        assertEq(fromAddr, FROM_ADDR, "From address from index should match");
        assertEq(toAddr, TO_ADDR, "To address from index should match");
        assertEq(returnedClaimId, claimId, "Claim ID should match");
        
        console.log("getClaimByIndex address checks passed!");
    }
} 