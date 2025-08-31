// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

// FDC Verification contract interface
interface IEVMTransaction {
    struct Event {
        uint32 logIndex;
        address emitterAddress;
        bytes32[] topics;
        bytes data;
        bool removed;
    }

    struct ResponseBody {
        uint64 blockNumber;
        uint64 timestamp;
        address sourceAddress;
        bool isDeployment;
        address receivingAddress;
        uint256 value;
        bytes input;
        uint8 status;
        Event[] events;
    }

    struct RequestBody {
        bytes32 transactionHash;
        uint16 requiredConfirmations;
        bool provideInput;
        bool listEvents;
        uint32[] logIndices;
    }

    struct Response {
        bytes32 attestationType;
        bytes32 sourceId;
        uint64 votingRound;
        uint64 lowestUsedTimestamp;
        RequestBody requestBody;
        ResponseBody responseBody;
    }

    struct Proof {
        bytes32[] merkleProof;
        Response data;
    }
}

interface IFdcVerification {
    function verifyEVMTransaction(IEVMTransaction.Proof calldata _proof)
        external
        view
        returns (bool);
}

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
        bytes32 transactionHash;
    }

    mapping(bytes32 => Claim) public claims;
    bytes32[] public claimIds;
    
    address public fdcContract;

    error AmountCannotBeZero();
    error MinConfsCannotBeZero();
    error BountyTooSmall();
    error NotThePoster();
    error ClaimNotOpen();
    error ClaimAlreadyResolved();
    error ClaimExpired();
    error ClaimNotFound();
    error FDCVerificationFailed();
    error InvalidFDCData();

    event ProofChecked(bytes32 indexed claimId, bool verified);
    event Called();
    
    constructor() {
        fdcContract = 0x075bf301fF07C4920e5261f93a0609640F53487D;
    }

    function getClaim(bytes32 claimId) external view returns (Claim memory) {
        Claim memory claim = claims[claimId];
        if (claim.poster == address(0)) revert ClaimNotFound();
        return claim;
    }

    function getClaimsCount() external view returns (uint256) {
        return claimIds.length;
    }
    
    function getClaimByIndex(uint256 index) external view returns (bytes32 claimId, address poster, uint256 amount, uint256 bounty, uint8 status) {
        require(index < claimIds.length, "Index out of bounds");
        bytes32 id = claimIds[index];
        Claim memory claim = claims[id];
        return (id, claim.poster, claim.amount, claim.bounty, uint8(claim.status));
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
            winner: address(0),
            transactionHash: bytes32(0)
        });

        claimIds.push(claimId);
        return claimId;
    }

    // New function: Verify claim using FDC
    function verifyClaimWithFDC(
        bytes32 claimId,
        IEVMTransaction.Proof calldata proof
    ) external {
        Claim storage claim = claims[claimId];
        if (claim.status != Status.Open) revert ClaimAlreadyResolved();
        // if (claim.deadline < block.timestamp) revert ClaimExpired();

        // // Verify the FDC data matches the claim
        // if (!_validateFDCData(claim, fdcData)) revert InvalidFDCData();

        emit Called();

        // Call FDC contract for verification
        bool verified;
        // Try/catch avoids “missing revert data” nuking your demo if proof is bad
        try IFdcVerification(fdcContract).verifyEVMTransaction(proof) returns (bool ok) {
            verified = ok;
        } catch {
            verified = false;
        }
        emit ProofChecked(claimId, verified);

        if (!verified) revert FDCVerificationFailed();

        // if (!verified) revert FDCVerificationFailed();

        // // // Update claim with verification results
        // claim.status = Status.Resolved;
        // claim.winner = msg.sender;
        // claim.transactionHash = proof.data.requestBody.transactionHash;

        // // Transfer bounty to verifier
        // payable(msg.sender).transfer(claim.bounty);

        emit Called();
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
