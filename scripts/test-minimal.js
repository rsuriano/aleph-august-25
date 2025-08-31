const { ethers } = require('ethers');

const CONTRACT_ADDRESS = "0x4E8C307aabC863Bfd4Fb2F9cc03EB8E5660F89f5"; // Minimal contract
const RPC_URL = "https://coston2-api.flare.network/ext/C/rpc";
const PRIVATE_KEY = "0x4e3955fca88cd55cd6a42306ecb53a5dbbcd343591abfa87e2836bd516887f90";

// Proof data que sabemos que funciona
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
    "name": "testFDCVerification",
    "inputs": [
      {
        "name": "proof",
        "type": "tuple",
        "components": [
          { "name": "merkleProof", "type": "bytes32[]" },
          {
            "name": "data",
            "type": "tuple",
            "components": [
              { "name": "attestationType", "type": "bytes32" },
              { "name": "sourceId", "type": "bytes32" },
              { "name": "votingRound", "type": "uint64" },
              { "name": "lowestUsedTimestamp", "type": "uint64" },
              {
                "name": "requestBody",
                "type": "tuple",
                "components": [
                  { "name": "transactionHash", "type": "bytes32" },
                  { "name": "requiredConfirmations", "type": "uint16" },
                  { "name": "provideInput", "type": "bool" },
                  { "name": "listEvents", "type": "bool" },
                  { "name": "logIndices", "type": "uint32[]" }
                ]
              },
              {
                "name": "responseBody",
                "type": "tuple",
                "components": [
                  { "name": "blockNumber", "type": "uint64" },
                  { "name": "timestamp", "type": "uint64" },
                  { "name": "sourceAddress", "type": "address" },
                  { "name": "isDeployment", "type": "bool" },
                  { "name": "receivingAddress", "type": "address" },
                  { "name": "value", "type": "uint256" },
                  { "name": "input", "type": "bytes" },
                  { "name": "status", "type": "uint8" },
                  { 
                    "name": "events", 
                    "type": "tuple[]", 
                    "components": [
                      { "name": "logIndex", "type": "uint32" },
                      { "name": "emitterAddress", "type": "address" },
                      { "name": "topics", "type": "bytes32[]" },
                      { "name": "data", "type": "bytes" },
                      { "name": "removed", "type": "bool" }
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
  console.log("🧪 Testing MINIMAL FDC verification...\n");
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

  // Format proof
  const proof = {
    merkleProof: PROOF_DATA.proof,
    data: {
      attestationType: PROOF_DATA.response.attestationType,
      sourceId: PROOF_DATA.response.sourceId,
      votingRound: PROOF_DATA.response.votingRound,
      lowestUsedTimestamp: PROOF_DATA.response.lowestUsedTimestamp,
      requestBody: PROOF_DATA.response.requestBody,
      responseBody: {
        ...PROOF_DATA.response.responseBody,
        events: PROOF_DATA.response.responseBody.events // Usar los events originales
      }
    }
  };

  console.log("📋 Testing with proof data:");
  console.log("- TX Hash:", PROOF_DATA.response.requestBody.transactionHash);
  console.log("- From:", PROOF_DATA.response.responseBody.sourceAddress);
  console.log("- To:", PROOF_DATA.response.responseBody.receivingAddress);
  console.log("- Value:", PROOF_DATA.response.responseBody.value);

  try {
    console.log("\n🔧 Calling testFDCVerification...");
    const tx = await contract.testFDCVerification(proof);
    console.log("📤 Transaction sent:", tx.hash);
    
    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log("🎉 SUCCESS! FDC verification passed!");
      console.log("- Block:", receipt.blockNumber);
      console.log("- Gas used:", receipt.gasUsed.toString());
      
      // Check events
      if (receipt.logs.length > 0) {
        console.log("\n📊 Events emitted:");
        receipt.logs.forEach((log, i) => {
          console.log(`- Log ${i}:`, log.topics);
        });
      }
    } else {
      console.log("❌ Transaction failed");
    }
    
  } catch (error) {
    console.log("❌ Error:");
    console.log("Message:", error.message);
    
    if (error.message.includes("FDC verification failed")) {
      console.log("💡 FDC returned false - the proof is invalid");
    }
  }
}

main().catch(console.error); 