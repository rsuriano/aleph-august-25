// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract ClaimBoard {
    enum Status {
        Open,
        Resolved,
        Cancelled
    }

    struct Claim {
        uint16  sourceChainId;   // FDC source id for BTC/XRP/DOGE
        bytes   fromAddr;        // raw bytes (chain-specific format); allow empty if chain can’t prove “from”
        bytes   toAddr;          // raw bytes
        uint256 amount;          // exact units (chain’s smallest unit)
        uint64  deadline;        // unix seconds; before=existence, after=non-existence
        uint32  minConfs;        // confirmations required for Payment
        address poster;          // who funded the bounty
        uint256 bounty;          // native coin escrowed (payable at post)
        Status  status;          // Open / Resolved / Cancelled
        address winner;          // verifier that got paid
      }

    mapping(bytes32 => Claim) claims;  // claimId = keccak(sourceChainId, from,to,amount,deadline,poster,nonce)
      
    error DeadlineInThePast();
    error AmountCannotBeZero();
    error MinConfsCannotBeZero();
    error BountyCannotBeLessThan10();
    error NotThePoster();
    error ClaimNotOpen();
    error ClaimAlreadyResolved();
    error ClaimExpired();

    function getClaim(bytes32 claimId) public view returns (Claim memory) {
        return claims[claimId];
    }

    function postClaim(
        uint16 sourceChainId,
        bytes calldata fromAddr,
        bytes calldata toAddr,
        uint256 amount,
        uint64 deadline,
        uint32 minConfs
    ) external payable returns (bytes32 claimId) {
        if (deadline < block.timestamp) {
            revert DeadlineInThePast();
        }

        if (amount == 0) {
            revert AmountCannotBeZero();
        }

        if (minConfs == 0) {
            revert MinConfsCannotBeZero();
        }

        if (msg.value < 10) {
            revert BountyCannotBeLessThan10();
        }

        claimId = keccak256(abi.encode(sourceChainId, fromAddr, toAddr, amount, deadline, minConfs, msg.sender));

        claims[claimId] = Claim({
            sourceChainId: sourceChainId,
            fromAddr: fromAddr,
            toAddr: toAddr,
            amount: amount,
            deadline: deadline,
            minConfs: minConfs,
            poster: msg.sender,
            bounty: msg.value,
            status: Status.Open,
            winner: address(0)
        });
    }

    function verifyPayment(bytes32 claimId) public {
        Claim storage claim = claims[claimId];
        
        if (claim.status != Status.Open) {
            revert ClaimAlreadyResolved();
        }

        if (claim.deadline < block.timestamp) {
            revert ClaimExpired();
        }

        // TODO: verify payment using merkle proof

        claim.status = Status.Resolved;
        claim.winner = msg.sender;
        
        payable(msg.sender).transfer(claim.bounty);
    }

    function verifyNonExistence(bytes32 claimId) public {
        Claim storage claim = claims[claimId];
        
        if (claim.status != Status.Open) {
            revert ClaimAlreadyResolved();
        }

        if (claim.deadline < block.timestamp) {
            revert ClaimExpired();
        }

        // TODO: verify non-existence using merkle proof


        claim.status = Status.Resolved;
        claim.winner = msg.sender;

        payable(msg.sender).transfer(claim.bounty);
    }

    function cancelClaim(bytes32 claimId) public {
        Claim storage claim = claims[claimId];

        if (msg.sender != claim.poster) {
            revert NotThePoster();
        }

        if (claim.status != Status.Open) {
            revert ClaimNotOpen();
        }

        uint256 bounty = claim.bounty;
        claim.status = Status.Cancelled;
        claim.winner = address(0);
        claim.bounty = 0; // Prevent reentrancy

        payable(claim.poster).transfer(bounty);
    }
}
