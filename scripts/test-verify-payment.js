const { ethers } = require('ethers');

const CONTRACT_ADDRESS = "0x1bd84639C18F2CB830896731a57BaF82c140a1bc"; // Fixed contract
const RPC_URL = "https://coston2-api.flare.network/ext/C/rpc";
const PRIVATE_KEY = "0x4e3955fca88cd55cd6a42306ecb53a5dbbcd343591abfa87e2836bd516887f90";

// Claim ID from the fixed contract (pure bytes addresses)
const CLAIM_ID = "0xe9df6fefe420e36b5a7245257571645d953aabae5977912da7bf1e7d53e0c3cb";

// Proof data from fetch-proof.ts (the one that worked)
const PROOF_DATA = {
  "response": {
    "attestationType": "0x45564d5472616e73616374696f6e000000000000000000000000000000000000",
    "sourceId": "0x7465737445544800000000000000000000000000000000000000000000000000",
    "votingRound": 1090555,
    "lowestUsedTimestamp": 1756558896,
    "requestBody": {
      "transactionHash": "0x9677b2eab721d53f34f60ad0c9e0730bd480d248a1c0421c2724f1cf0d3bb2d3",
      "requiredConfirmations": 2,
      "provideInput": true,
      "listEvents": false,
      "logIndices": []
    },
    "responseBody": {
      "blockNumber": 9096518,
      "timestamp": 1756558896,
      "sourceAddress": "0xd1c157cbf1a0ce6064ad9f733261364e1ed8fc66",
      "isDeployment": false,
      "receivingAddress": "0x08d2b0a37f869ff76bacb5bab3278e26ab7067b7",
      "value": 100000000000000,
      "input": "0x",
      "status": 1,
      "events": []
    }
  },
  "proof": [
    "0x911783d2f9c256cc296fbe55d74d9d54cd012195b047db6598201db4a7eb00e1",
    "0x7e9f4afb0bb47ae93ee6ae96d335da659a9351b30bcdc14954c44d64410ed935",
    "0x1048f9c6e786d8aa9a560fcfc8259c71c457b224f990c7af0a4fc39f7a7d6687",
    "0xc6550e8ff003994093017e7b5cda3d7e26a302a7eadcd68ebb69e5dfaeb513dc"
  ]
};

const CONTRACT_ABI = [
  {
    "type": "function",
    "name": "verifyPayment",
    "inputs": [
      {
        "name": "claimId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "proof",
        "type": "tuple",
        "internalType": "struct IFDCVerification.EVMTransactionProof",
        "components": [
          {
            "name": "merkleProof",
            "type": "bytes32[]",
            "internalType": "bytes32[]"
          },
          {
            "name": "data",
            "type": "tuple",
            "internalType": "struct IFDCVerification.EVMTransactionData",
            "components": [
              {
                "name": "attestationType",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "sourceId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "votingRound",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "lowestUsedTimestamp",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "requestBody",
                "type": "tuple",
                "internalType": "struct IFDCVerification.RequestBody",
                "components": [
                  {
                    "name": "transactionHash",
                    "type": "bytes32",
                    "internalType": "bytes32"
                  },
                  {
                    "name": "requiredConfirmations",
                    "type": "uint16",
                    "internalType": "uint16"
                  },
                  {
                    "name": "provideInput",
                    "type": "bool",
                    "internalType": "bool"
                  },
                  {
                    "name": "listEvents",
                    "type": "bool",
                    "internalType": "bool"
                  },
                  {
                    "name": "logIndices",
                    "type": "uint32[]",
                    "internalType": "uint32[]"
                  }
                ]
              },
              {
                "name": "responseBody",
                "type": "tuple",
                "internalType": "struct IFDCVerification.ResponseBody",
                "components": [
                  {
                    "name": "blockNumber",
                    "type": "uint64",
                    "internalType": "uint64"
                  },
                  {
                    "name": "timestamp",
                    "type": "uint64",
                    "internalType": "uint64"
                  },
                  {
                    "name": "sourceAddress",
                    "type": "address",
                    "internalType": "address"
                  },
                  {
                    "name": "isDeployment",
                    "type": "bool",
                    "internalType": "bool"
                  },
                  {
                    "name": "receivingAddress",
                    "type": "address",
                    "internalType": "address"
                  },
                  {
                    "name": "value",
                    "type": "uint256",
                    "internalType": "uint256"
                  },
                  {
                    "name": "input",
                    "type": "bytes",
                    "internalType": "bytes"
                  },
                  {
                    "name": "status",
                    "type": "uint8",
                    "internalType": "uint8"
                  },
                  {
                    "name": "events",
                    "type": "tuple[]",
                    "internalType": "struct IFDCVerification.Event[]",
                    "components": [
                      {
                        "name": "logIndex",
                        "type": "uint32",
                        "internalType": "uint32"
                      },
                      {
                        "name": "emitterAddress",
                        "type": "address",
                        "internalType": "address"
                      },
                      {
                        "name": "topics",
                        "type": "bytes32[]",
                        "internalType": "bytes32[]"
                      },
                      {
                        "name": "data",
                        "type": "bytes",
                        "internalType": "bytes"
                      },
                      {
                        "name": "removed",
                        "type": "bool",
                        "internalType": "bool"
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
];

async function main() {
  console.log("🚀 Testing verifyPayment with FDC proof...\n");
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

  // Format the proof data for the contract call
  const proof = {
    merkleProof: PROOF_DATA.proof,
    data: {
      attestationType: PROOF_DATA.response.attestationType,
      sourceId: PROOF_DATA.response.sourceId,
      votingRound: PROOF_DATA.response.votingRound,
      lowestUsedTimestamp: PROOF_DATA.response.lowestUsedTimestamp,
      requestBody: {
        transactionHash: PROOF_DATA.response.requestBody.transactionHash,
        requiredConfirmations: PROOF_DATA.response.requestBody.requiredConfirmations,
        provideInput: PROOF_DATA.response.requestBody.provideInput,
        listEvents: PROOF_DATA.response.requestBody.listEvents,
        logIndices: PROOF_DATA.response.requestBody.logIndices
      },
      responseBody: {
        blockNumber: PROOF_DATA.response.responseBody.blockNumber,
        timestamp: PROOF_DATA.response.responseBody.timestamp,
        sourceAddress: PROOF_DATA.response.responseBody.sourceAddress,
        isDeployment: PROOF_DATA.response.responseBody.isDeployment,
        receivingAddress: PROOF_DATA.response.responseBody.receivingAddress,
        value: PROOF_DATA.response.responseBody.value,
        input: PROOF_DATA.response.responseBody.input,
        status: PROOF_DATA.response.responseBody.status,
        events: PROOF_DATA.response.responseBody.events
      }
    }
  };

  console.log("📋 Verification details:");
  console.log("- Claim ID:", CLAIM_ID);
  console.log("- Transaction Hash:", PROOF_DATA.response.requestBody.transactionHash);
  console.log("- From Address:", PROOF_DATA.response.responseBody.sourceAddress);
  console.log("- To Address:", PROOF_DATA.response.responseBody.receivingAddress);
  console.log("- Value:", PROOF_DATA.response.responseBody.value);
  console.log("- Voting Round:", PROOF_DATA.response.votingRound);

  try {
    console.log("\n🔧 Calling verifyPayment...");
    const tx = await contract.verifyPayment(CLAIM_ID, proof);
    console.log("📤 Transaction sent:", tx.hash);
    
    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log("🎉 SUCCESS! Payment verified successfully!");
      console.log("- Block:", receipt.blockNumber);
      console.log("- Gas used:", receipt.gasUsed.toString());
    } else {
      console.log("❌ Transaction failed");
    }
    
  } catch (error) {
    console.log("❌ Error calling verifyPayment:");
    console.log("Error message:", error.message);
    
    if (error.message.includes("InvalidProof")) {
      console.log("💡 The FDC proof verification failed");
    } else if (error.message.includes("TransactionMismatch")) {
      console.log("💡 The transaction data doesn't match the claim");
    } else if (error.message.includes("ClaimExpired")) {
      console.log("💡 The claim has expired");
    } else if (error.message.includes("ClaimAlreadyResolved")) {
      console.log("💡 The claim was already resolved");
    }
  }
}

main().catch(console.error); 