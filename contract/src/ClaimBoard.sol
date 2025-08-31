// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

// FDC Verification Interface
interface IFDCVerification {
    struct EVMTransactionProof {
        bytes32[] merkleProof;
        EVMTransactionData data;
    }
    
    struct EVMTransactionData {
        bytes32 attestationType;
        bytes32 sourceId;
        uint64 votingRound;
        uint64 lowestUsedTimestamp;
        RequestBody requestBody;
        ResponseBody responseBody;
    }
    
    struct RequestBody {
        bytes32 transactionHash;
        uint16 requiredConfirmations;
        bool provideInput;
        bool listEvents;
        uint32[] logIndices;
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
    
    struct Event {
        uint32 logIndex;
        address emitterAddress;
        bytes32[] topics;
        bytes data;
        bool removed;
    }
    
    function verifyEVMTransaction(EVMTransactionProof calldata proof) external view returns (bool);
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
    }

    // FDC Contract address on Coston2
    IFDCVerification public constant fdcVerification = IFDCVerification(0x075bf301fF07C4920e5261f93a0609640F53487D);

    mapping(bytes32 => Claim) public claims;
    bytes32[] public claimIds;
      
    error AmountCannotBeZero();
    error MinConfsCannotBeZero();
    error BountyTooSmall();
    error NotThePoster();
    error ClaimNotOpen();
    error ClaimAlreadyResolved();
    error ClaimExpired();
    error ClaimNotFound();
    error InvalidProof();
    error TransactionMismatch();
    
    event DebugAddresses(address claimFrom, address claimTo, address proofFrom, address proofTo);
    event DebugValues(uint256 claimAmount, uint256 proofValue);

    function getClaim(bytes32 claimId) external view returns (Claim memory) {
        Claim memory claim = claims[claimId];
        if (claim.poster == address(0)) revert ClaimNotFound();
        return claim;
    }

    function getClaimsCount() external view returns (uint256) {
        return claimIds.length;
    }
    
    function getClaimByIndex(uint256 index) external view returns (
        bytes32 claimId, 
        address poster, 
        uint256 amount, 
        uint256 bounty, 
        uint8 status, 
        uint64 deadline,
        uint16 sourceChainId,
        address fromAddr,
        address toAddr,
        uint32 minConfs
    ) {
        require(index < claimIds.length, "Index out of bounds");
        bytes32 id = claimIds[index];
        Claim memory claim = claims[id];
        
        // Convert bytes to address (assuming Ethereum addresses)
        address from = address(0);
        address to = address(0);
        
        if (claim.fromAddr.length >= 20) {
            bytes memory fromBytes = claim.fromAddr;
            assembly {
                from := mload(add(fromBytes, 32))
            }
        }
        
        if (claim.toAddr.length >= 20) {
            bytes memory toBytes = claim.toAddr;
            assembly {
                to := mload(add(toBytes, 32))
            }
        }
        
        return (
            id, 
            claim.poster, 
            claim.amount, 
            claim.bounty, 
            uint8(claim.status), 
            claim.deadline,
            claim.sourceChainId,
            from,
            to,
            claim.minConfs
        );
    }

    function postClaim(
        uint16 sourceChainId,
        bytes calldata fromAddr,
        bytes calldata toAddr,
        uint256 amount,
        uint32 minConfs,
        uint32 expirationMinutes
    ) external payable returns (bytes32) {
        if (amount == 0) revert AmountCannotBeZero();
        if (minConfs == 0) revert MinConfsCannotBeZero();
        if (msg.value < 0.001 ether) revert BountyTooSmall();
        if (expirationMinutes == 0) revert("Expiration minutes cannot be zero");

        // Calculate deadline: current timestamp + expirationMinutes
        uint64 deadline = uint64(block.timestamp + (expirationMinutes * 60));
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

        claimIds.push(claimId);
        return claimId;
    }

    function verifyPayment(bytes32 claimId, IFDCVerification.EVMTransactionProof calldata proof) external {
        Claim storage claim = claims[claimId];
        if (claim.status != Status.Open) revert ClaimAlreadyResolved();
        if (claim.deadline < block.timestamp) revert ClaimExpired();

        // STEP 1: FDC verification
        bool isValid = fdcVerification.verifyEVMTransaction(proof);
        if (!isValid) revert InvalidProof();

        // Verify transaction details match the claim
        IFDCVerification.ResponseBody memory response = proof.data.responseBody;
        
        // Convert claim addresses
        address claimFromAddr = _bytesToAddress(claim.fromAddr);
        address claimToAddr = _bytesToAddress(claim.toAddr);
        
        // Verify all transaction details
        if (response.sourceAddress != claimFromAddr) revert TransactionMismatch();
        if (response.receivingAddress != claimToAddr) revert TransactionMismatch();
        if (response.value != claim.amount) revert TransactionMismatch();
        if (response.status != 1) revert TransactionMismatch();
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

    // Helper function to convert bytes to address
    function _bytesToAddress(bytes memory data) internal pure returns (address) {
        if (data.length < 20) return address(0);
        
        address result;
        assembly {
            // Load from data + 32 (skip length) but shift right to get the address
            // For 20-byte data, we need to shift right by 12 bytes (96 bits)
            result := shr(96, mload(add(data, 0x20)))
        }
        return result;
    }
    
    // DEBUG: Public function to test bytes conversion
    function debugBytesToAddress(bytes memory data) external pure returns (address, uint256) {
        address converted = _bytesToAddress(data);
        return (converted, data.length);
    }
}
