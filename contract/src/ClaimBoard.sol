// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract ClaimBoard {
    enum Status { Open, Resolved, Cancelled }

    struct Claim {
        uint16  sourceChainId;
        bytes   fromAddr;
        bytes   toAddr;
        uint256 amount;
        uint64  deadline;
        uint32  minConfs;
        address poster;
        uint256 bounty;
        Status  status;
        address winner;
    }

    mapping(bytes32 => Claim) public claims;
      
    error AmountCannotBeZero();
    error MinConfsCannotBeZero();
    error BountyTooSmall();
    error NotThePoster();
    error ClaimNotOpen();
    error ClaimAlreadyResolved();
    error ClaimExpired();
    error ClaimNotFound();

    function getClaim(bytes32 claimId) external view returns (Claim memory) {
        Claim memory claim = claims[claimId];
        if (claim.poster == address(0)) revert ClaimNotFound();
        return claim;
    }

    function postClaim(
        uint16 sourceChainId,
        bytes calldata fromAddr,
        bytes calldata toAddr,
        uint256 amount,
        uint32 minConfs
    ) external payable returns (bytes32) {
        if (amount == 0) revert AmountCannotBeZero();
        if (minConfs == 0) revert MinConfsCannotBeZero();
        if (msg.value < 0.001 ether) revert BountyTooSmall();

        uint64 deadline = uint64(block.timestamp + 1 hours);
        bytes32 claimId = keccak256(abi.encode(sourceChainId, fromAddr, toAddr, amount, deadline, minConfs, msg.sender));

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

        return claimId;
    }

    function verifyPayment(bytes32 claimId) external {
        Claim storage claim = claims[claimId];
        if (claim.status != Status.Open) revert ClaimAlreadyResolved();
        if (claim.deadline < block.timestamp) revert ClaimExpired();

        claim.status = Status.Resolved;
        claim.winner = msg.sender;
        payable(msg.sender).transfer(claim.bounty);
    }

    function verifyNonExistence(bytes32 claimId) external {
        Claim storage claim = claims[claimId];
        if (claim.status != Status.Open) revert ClaimAlreadyResolved();
        if (claim.deadline < block.timestamp) revert ClaimExpired();

        claim.status = Status.Resolved;
        claim.winner = msg.sender;
        payable(msg.sender).transfer(claim.bounty);
    }

    function cancelClaim(bytes32 claimId) external {
        Claim storage claim = claims[claimId];
        if (msg.sender != claim.poster) revert NotThePoster();
        if (claim.status != Status.Open) revert ClaimNotOpen();

        claim.status = Status.Cancelled;
        payable(claim.poster).transfer(claim.bounty);
    }
}
