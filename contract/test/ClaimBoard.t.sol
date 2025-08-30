// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {ClaimBoard} from "../src/ClaimBoard.sol";
import {console} from "forge-std/console.sol";

contract ClaimBoardTest is Test {
    ClaimBoard public claimBoard;
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");

    function setUp() public {
        claimBoard = new ClaimBoard();
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(charlie, 100 ether);
    }

    function test_PostClaim() public {
        vm.startPrank(alice);
        
        bytes32 claimId = claimBoard.postClaim{value: 1 ether}(
            1, // sourceChainId
            "0x1234", // fromAddr
            "0x5678", // toAddr
            1000, // amount
            uint64(block.timestamp + 1 days), // deadline
            6 // minConfs
        );
        
        vm.stopPrank();
        
        assertTrue(claimId != bytes32(0));
    }

    function test_PostClaimWithPastDeadline() public {
        vm.startPrank(alice);
        
        vm.expectRevert(ClaimBoard.DeadlineInThePast.selector);
        claimBoard.postClaim{value: 1 ether}(
            1, // sourceChainId
            "0x1234", // fromAddr
            "0x5678", // toAddr
            1000, // amount
            uint64(block.timestamp - 1), // past deadline (just 1 second ago)
            6 // minConfs
        );
        
        vm.stopPrank();
    }

    function test_PostClaimWithZeroAmount() public {
        vm.startPrank(alice);
        
        vm.expectRevert(ClaimBoard.AmountCannotBeZero.selector);
        claimBoard.postClaim{value: 1 ether}(
            1, // sourceChainId
            "0x1234", // fromAddr
            "0x5678", // toAddr
            0, // zero amount
            uint64(block.timestamp + 1 days), // deadline
            6 // minConfs
        );
        
        vm.stopPrank();
    }

    function test_PostClaimWithZeroMinConfs() public {
        vm.startPrank(alice);
        
        vm.expectRevert(ClaimBoard.MinConfsCannotBeZero.selector);
        claimBoard.postClaim{value: 1 ether}(
            1, // sourceChainId
            "0x1234", // fromAddr
            "0x5678", // toAddr
            1000, // amount
            uint64(block.timestamp + 1 days), // deadline
            0 // zero minConfs
        );
        
        vm.stopPrank();
    }

    function test_PostClaimWithLowBounty() public {
        vm.startPrank(alice);
        
        vm.expectRevert(ClaimBoard.BountyCannotBeLessThan10.selector);
        claimBoard.postClaim{value: 5 wei}(
            1, // sourceChainId
            "0x1234", // fromAddr
            "0x5678", // toAddr
            1000, // amount
            uint64(block.timestamp + 1 days), // deadline
            6 // minConfs
        );
        
        vm.stopPrank();
    }

    function test_VerifyPayment() public {
        vm.startPrank(alice);
        
        bytes32 claimId = claimBoard.postClaim{value: 1 ether}(
            1, // sourceChainId
            "0x1234", // fromAddr
            "0x5678", // toAddr
            1000, // amount
            uint64(block.timestamp + 1 days), // deadline
            6 // minConfs
        );
        
        vm.stopPrank();
        
        vm.startPrank(bob);
        claimBoard.verifyPayment(claimId);
        vm.stopPrank();
        
        // Check that bob is marked as winner
        // Note: We can't easily check the status without a getter function
    }

    function test_CancelClaim() public {
        vm.startPrank(alice);
        
        bytes32 claimId = claimBoard.postClaim{value: 1 ether}(
            1, // sourceChainId
            "0x1234", // fromAddr
            "0x5678", // toAddr
            1000, // amount
            uint64(block.timestamp + 1 days), // deadline
            6 // minConfs
        );
        
        uint256 balanceBefore = alice.balance;
        claimBoard.cancelClaim(claimId);
        uint256 balanceAfter = alice.balance;
        
        // Alice should get her bounty back
        assertEq(balanceAfter, balanceBefore + 1 ether);
        vm.stopPrank();
    }

    function test_CancelClaimNotPoster() public {
        vm.startPrank(alice);
        
        bytes32 claimId = claimBoard.postClaim{value: 1 ether}(
            1, // sourceChainId
            "0x1234", // fromAddr
            "0x5678", // toAddr
            1000, // amount
            uint64(block.timestamp + 1 days), // deadline
            6 // minConfs
        );
        
        vm.stopPrank();
        
        vm.startPrank(bob);
        vm.expectRevert(ClaimBoard.NotThePoster.selector);
        claimBoard.cancelClaim(claimId);
        vm.stopPrank();
    }
}
