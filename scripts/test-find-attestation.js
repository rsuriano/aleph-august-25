const { ethers } = require('ethers');

// Example claim data
const exampleClaim = {
  claimId: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  poster: "0x742d35Cc6634C0532925a3b8D0C9964De0C3f2cE",
  amount: "1000000000000000000", // 1 ETH in wei
  bounty: "100000000000000000",  // 0.1 ETH in wei
  status: 0,
  deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  fromAddr: "0x742d35Cc6634C0532925a3b8D0C9964De0C3f2cE",
  toAddr: "0x8ba1f109551bD432803012645Hac136c22C177e9",
  description: "Test payment claim",
  chainId: 11155111 // Sepolia
};

async function findMatchingTransaction(claim) {
  console.log("🔍 Searching for transaction matching claim...");
  console.log(`- From: ${claim.fromAddr}`);
  console.log(`- To: ${claim.toAddr}`);
  console.log(`- Amount: ${claim.amount} wei`);
  console.log(`- Deadline: ${claim.deadline} (${new Date(claim.deadline * 1000).toISOString()})`);
  
  // Use Etherscan API for Sepolia
  const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "YourApiKeyToken";
  const ETHERSCAN_BASE = "https://api-sepolia.etherscan.io/api";
  
  try {
    const url = `${ETHERSCAN_BASE}?module=account&action=txlist&address=${claim.fromAddr}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    
    console.log("🔎 Fetching transactions from Etherscan...");
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Etherscan API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== "1") {
      console.log(`⚠️  Etherscan API response: ${data.message}`);
      return null;
    }
    
    const transactions = data.result;
    console.log(`📊 Found ${transactions.length} transactions from address ${claim.fromAddr}`);
    
    // Filter transactions that match our criteria
    for (const tx of transactions) {
      const txTimestamp = parseInt(tx.timeStamp);
      const txValue = tx.value;
      const txTo = tx.to;
      const txFrom = tx.from;
      
      // Check if transaction matches our criteria
      if (
        txFrom.toLowerCase() === claim.fromAddr.toLowerCase() &&
        txTo.toLowerCase() === claim.toAddr.toLowerCase() &&
        txValue === claim.amount &&
        txTimestamp > (claim.deadline - 86400) && // Within 24h before deadline
        txTimestamp < claim.deadline
      ) {
        console.log(`✅ Found matching transaction: ${tx.hash}`);
        console.log(`- Block: ${tx.blockNumber}`);
        console.log(`- Timestamp: ${txTimestamp} (${new Date(txTimestamp * 1000).toISOString()})`);
        console.log(`- From: ${tx.from}`);
        console.log(`- To: ${tx.to}`);
        console.log(`- Value: ${tx.value} wei`);
        
        return tx.hash;
      }
    }
    
    console.log("❌ No matching transaction found in the fetched transactions");
    return null;
    
  } catch (error) {
    console.error("⚠️  Error searching transactions:", error.message);
    return null;
  }
}

async function prepareAttestation(txHash) {
  const VERIFIER_BASE = process.env.VERIFIER_BASE || "https://fdc-api.flare.network";
  const VERIFIER_API_KEY = process.env.VERIFIER_API_KEY || "";
  
  console.log(`🔧 Preparing attestation for transaction: ${txHash}`);
  
  const requestBody = {
    attestationType: "0x45564d5472616e73616374696f6e000000000000000000000000000000000000", // EVMTransaction
    sourceId: "0x746573744554480000000000000000000000000000000000000000000000000", // testETH (Sepolia)
    transactionHash: txHash,
    requiredConfirmations: "1",
    provideInput: true,
    listEvents: true,
    logIndices: []
  };
  
  try {
    const response = await fetch(`${VERIFIER_BASE}/verifier/eth-sepolia/EVMTransaction/prepareRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': VERIFIER_API_KEY
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`Verifier API error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`✅ Attestation prepared successfully`);
    console.log(`- ABI Encoded Request: ${result.abiEncodedRequest}`);
    
    return result.abiEncodedRequest;
    
  } catch (error) {
    console.error("⚠️  Error preparing attestation:", error.message);
    return null;
  }
}

async function main() {
  console.log("🚀 Starting find and prepare attestation test...\n");
  
  // Step 1: Find matching transaction
  const txHash = await findMatchingTransaction(exampleClaim);
  
  if (!txHash) {
    console.log("❌ No transaction found, cannot prepare attestation");
    return;
  }
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Step 2: Prepare attestation
  const abiEncodedRequest = await prepareAttestation(txHash);
  
  if (abiEncodedRequest) {
    console.log("\n🎉 Process completed successfully!");
    console.log(`📋 Final result: ${abiEncodedRequest.substring(0, 100)}...`);
  } else {
    console.log("\n❌ Failed to prepare attestation");
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { findMatchingTransaction, prepareAttestation }; 