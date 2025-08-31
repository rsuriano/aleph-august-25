// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

// FDC Verification Interface (minimal)
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

contract MinimalClaimBoard {
    // FDC Contract address on Coston2
    IFDCVerification public constant fdcVerification = IFDCVerification(0x075bf301fF07C4920e5261f93a0609640F53487D);
    
    event ProofResult(bool isValid);
    event ProofData(address from, address to, uint256 value);
    
    // ULTRA MINIMAL: Solo verificar el proof, sin comparaciones
    function testFDCVerification(IFDCVerification.EVMTransactionProof calldata proof) external {
        // 1. Llamar FDC verification
        bool isValid = fdcVerification.verifyEVMTransaction(proof);
        
        // 2. Emitir eventos para debug
        emit ProofResult(isValid);
        emit ProofData(
            proof.data.responseBody.sourceAddress,
            proof.data.responseBody.receivingAddress,
            proof.data.responseBody.value
        );
        
        // 3. Si el proof es válido, SUCCESS. Si no, revert.
        require(isValid, "FDC verification failed");
        
        // Si llegamos acá, TODO FUNCIONA
    }
} 