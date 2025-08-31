const { ethers } = require('ethers');

const CONTRACT_ADDRESS = "0x012D720e7d2E84b24b68989e0f4aD824fE5B294C"; // Local Anvil
const RPC_URL = "http://localhost:8545";
const PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Anvil default

const CLAIM_ID = "0xfb741ebc70630276aa39c9686f1a4e0f4f26f60c9a56d56f663d3951fed4ee2d";

// Simplified proof data
const PROOF_DATA = {
  merkleProof: [
    "0x911783d2f9c256cc296fbe55d74d9d54cd012195b047db6598201db4a7eb00e1",
    "0x7e9f4afb0bb47ae93ee6ae96d335da659a9351b30bcdc14954c44d64410ed935",
    "0x1048f9c6e786d8aa9a560fcfc8259c71c457b224f990c7af0a4fc39f7a7d6687",
    "0xc6550e8ff003994093017e7b5cda3d7e26a302a7eadcd68ebb69e5dfaeb513dc"
  ],
  data: {
    attestationType: "0x4564d5472616e73616374696f6e0000000000000000000000000000000000000",
    sourceId: "0x7465737445544800000000000000000000000000000000000000000000000000",
    votingRound: 1090555,
    lowestUsedTimestamp: 1754467888,
    requestBody: {
      transactionHash: "0x9677b2eab721d53f34f60ad0c9e0730bd480d248a1c0421c2724f1cf0d3bb2d3",
      requiredConfirmations: 2,
      provideInput: true,
      listEvents: false,
      logIndices: []
    },
    responseBody: {
      blockNumber: 568548,
      timestamp: 1754467888,
      sourceAddress: "0xd1c157cbf1a0ce6064ad9f733261364e1ed8fc66",
      isDeployment: false,
      receivingAddress: "0x08d2b0a37f869ff76bacb5bab3278e26ab7067b7",
      value: 100000000000000,
      input: "0x",
      status: 1,
      events: []
    }
  }
};

async function main() {
  console.log("🔍 LOCAL DEBUG: Testing with console.log output...\n");
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  
  // Simple ABI for verifyPayment
  const abi = [
    "function verifyPayment(bytes32 claimId, tuple(bytes32[] merkleProof, tuple(bytes32 attestationType, bytes32 sourceId, uint64 votingRound, uint64 lowestUsedTimestamp, tuple(bytes32 transactionHash, uint16 requiredConfirmations, bool provideInput, bool listEvents, uint32[] logIndices) requestBody, tuple(uint64 blockNumber, uint64 timestamp, address sourceAddress, bool isDeployment, address receivingAddress, uint256 value, bytes input, uint8 status, tuple(uint32 logIndex, address emitterAddress, bytes32[] topics, bytes data, bool removed)[] events) responseBody) data) proof)"
  ];
  
  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
  
  console.log("📋 Debug test:");
  console.log("- Claim ID:", CLAIM_ID);
  console.log("- Proof FROM:", PROOF_DATA.data.responseBody.sourceAddress);
  console.log("- Proof TO:", PROOF_DATA.data.responseBody.receivingAddress);
  console.log("- Value:", PROOF_DATA.data.responseBody.value);
  
  try {
    console.log("\n🔧 Calling verifyPayment (should show console.log output)...");
    const tx = await contract.verifyPayment(CLAIM_ID, PROOF_DATA);
    console.log("📤 Transaction sent:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    
  } catch (error) {
    console.log("❌ Expected error (but we should see console.log output above):");
    console.log("Error message:", error.message);
  }
}

main().catch(console.error); 