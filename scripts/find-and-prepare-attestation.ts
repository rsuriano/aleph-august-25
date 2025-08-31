import "dotenv/config";
import { JsonRpcProvider } from "ethers";

// Types from the ClaimBoard
type Claim = {
  claimId: string;
  poster: string;
  amount: string;
  bounty: string;
  status: number;
  deadline: number;
  sourceChainId: number;
  fromAddr: string;
  toAddr: string;
  minConfs: number;
};

type PrepareReqBody = {
  attestationType: string;
  sourceId: string;
  requestBody: {
    transactionHash: string;
    requiredConfirmations: string;
    provideInput: boolean;
    listEvents: boolean;
    logIndices: number[];
  };
};

type PrepareResp =
  | { status: "VALID"; abiEncodedRequest: `0x${string}` }
  | { status: "INVALID"; reason?: string; details?: unknown };

// Configuration
const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const VERIFIER_BASE = process.env.VERIFIER_BASE || "https://fdc-verifiers-testnet.flare.network";
const VERIFIER_API_KEY = process.env.VERIFIER_API_KEY || "00000000-0000-0000-0000-000000000000";
const REQUIRED_CONFIRMS = 2;

/** Turn an ASCII string into 32-byte, right-padded hex (UTF-8) */
function toBytes32Utf8Padded(str: string): string {
  const enc = new TextEncoder().encode(str);
  if (enc.length > 32) throw new Error(`String too long for bytes32: "${str}"`);
  const bytes = new Uint8Array(32);
  bytes.set(enc, 0);
  return "0x" + Buffer.from(bytes).toString("hex");
}

/** Search for transactions matching the claim criteria using address-based search */
async function findMatchingTransaction(claim: Claim): Promise<string | null> {
  console.log("🔍 Searching for transaction matching claim...");
  console.log(`- From: ${claim.fromAddr}`);
  console.log(`- To: ${claim.toAddr}`);
  console.log(`- Amount: ${claim.amount} wei`);
  console.log(`- Deadline: ${claim.deadline} (${new Date(claim.deadline * 1000).toISOString()})`);
  
  // Use Etherscan API for Sepolia to get transactions by address
  const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "YourApiKeyToken";
  const ETHERSCAN_BASE = "https://api-sepolia.etherscan.io/api";
  
  try {
    // Get transactions sent FROM the fromAddr
    const url = `${ETHERSCAN_BASE}?module=account&action=txlist&address=${claim.fromAddr}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    
    console.log("🔎 Fetching transactions from Etherscan...");
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Etherscan API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== "1") {
      throw new Error(`Etherscan API error: ${data.message}`);
    }
    
    const transactions = data.result;
    console.log(`📊 Found ${transactions.length} transactions from address ${claim.fromAddr}`);
    
    // Filter transactions that match our criteria
    for (const tx of transactions) {
      const txTimestamp = parseInt(tx.timeStamp);
      const txValue = tx.value;
      const txTo = tx.to;
      const txFrom = tx.from;
      
      // Check if transaction matches our criteria:
      // 1. From address matches
      // 2. To address matches  
      // 3. Value matches
      // 4. Timestamp is after claim creation and before deadline
      if (
        txFrom.toLowerCase() === claim.fromAddr.toLowerCase() &&
        txTo.toLowerCase() === claim.toAddr.toLowerCase() &&
        txValue === claim.amount &&
        txTimestamp > (claim.deadline - 86400) && // Assume claim was created max 24h before deadline
        txTimestamp < claim.deadline
      ) {
        console.log(`✅ Found matching transaction: ${tx.hash}`);
        console.log(`- Block: ${tx.blockNumber}`);
        console.log(`- Timestamp: ${txTimestamp} (${new Date(txTimestamp * 1000).toISOString()})`);
        console.log(`- From: ${tx.from}`);
        console.log(`- To: ${tx.to}`);
        console.log(`- Value: ${tx.value} wei`);
        console.log(`- Gas Used: ${tx.gasUsed}`);
        
        return tx.hash;
      }
    }
    
    console.log("❌ No matching transaction found in the fetched transactions");
    return null;
    
  } catch (error) {
    console.error("⚠️  Error searching transactions:", error);
    
    // Fallback: try a simple provider-based search (less efficient but doesn't require API key)
    console.log("🔄 Falling back to provider-based search...");
    return await findMatchingTransactionFallback(claim);
  }
}

/** Fallback method using provider (less efficient but doesn't require API key) */
async function findMatchingTransactionFallback(claim: Claim): Promise<string | null> {
  const provider = new JsonRpcProvider(SEPOLIA_RPC);
  
  // Get recent blocks (last ~24 hours worth)
  const currentBlock = await provider.getBlockNumber();
  const blocksToSearch = 7200; // ~24 hours of blocks (12s per block)
  const fromBlock = Math.max(0, currentBlock - blocksToSearch);
  
  console.log(`📊 Fallback: Searching last ${blocksToSearch} blocks (${fromBlock} to ${currentBlock})`);
  
  for (let blockNum = currentBlock; blockNum >= fromBlock; blockNum--) {
    try {
      const block = await provider.getBlock(blockNum, true);
      if (!block) continue;
      
      // Check if block timestamp is in our range
      if (block.timestamp < (claim.deadline - 86400) || block.timestamp > claim.deadline) {
        continue;
      }
      
      // Check each transaction in the block
      for (const tx of block.transactions) {
        if (typeof tx === 'string') continue;
        
        if (
          tx.from?.toLowerCase() === claim.fromAddr.toLowerCase() &&
          tx.to?.toLowerCase() === claim.toAddr.toLowerCase() &&
          tx.value?.toString() === claim.amount
        ) {
          console.log(`✅ Found matching transaction: ${tx.hash}`);
          return tx.hash;
        }
      }
    } catch (error) {
      console.warn(`⚠️  Error checking block ${blockNum}:`, error);
      continue;
    }
  }
  
  return null;
}

/** Prepare attestation request using the found transaction hash */
async function prepareAttestation(txHash: string): Promise<string> {
  const url = `${VERIFIER_BASE}/verifier/eth-sepolia/EVMTransaction/prepareRequest`;
  
  const body: PrepareReqBody = {
    attestationType: toBytes32Utf8Padded("EVMTransaction"),
    sourceId: toBytes32Utf8Padded("testETH"),
    requestBody: {
      transactionHash: txHash,
      requiredConfirmations: REQUIRED_CONFIRMS.toString(),
      provideInput: true,
      listEvents: false,
      logIndices: [],
    },
  };
  
  console.log("🔄 Preparing attestation request...");
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-KEY": VERIFIER_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Verifier HTTP ${res.status}: ${text}`);
  }
  
  const json = (await res.json()) as PrepareResp;
  if (json.status !== "VALID") {
    throw new Error(`Verifier rejected the request: ${JSON.stringify(json)}`);
  }
  
  console.log("✅ Attestation request prepared successfully!");
  return json.abiEncodedRequest;
}

/** Main function to find transaction and prepare attestation */
export async function findAndPrepareAttestation(claim: Claim): Promise<string | null> {
  try {
    console.log(`🚀 Processing claim ${claim.claimId}...`);
    
    // Step 1: Find matching transaction
    const txHash = await findMatchingTransaction(claim);
    if (!txHash) {
      return null;
    }
    
    // Step 2: Prepare attestation
    const abiEncodedRequest = await prepareAttestation(txHash);
    
    console.log("\n🎉 Success! ABI Encoded Request:");
    console.log(abiEncodedRequest);
    
    return abiEncodedRequest;
    
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

// CLI usage example
async function main() {
  // Example claim - in real usage this would come from your frontend
  const exampleClaim: Claim = {
    claimId: "0x1234567890abcdef...",
    poster: "0x644ab44d11114bdf737039fee77e0028a774fa73",
    amount: "1000000000000000000", // 1 ETH in wei
    bounty: "100000000000000000", // 0.1 ETH
    status: 0,
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    sourceChainId: 11155111, // Sepolia
    fromAddr: "0x742d35cc6620c532c09c644b0bd8ab24c2e6d7e5",
    toAddr: "0x644ab44d11114bdf737039fee77e0028a774fa73",
    minConfs: 2,
  };
  
  const result = await findAndPrepareAttestation(exampleClaim);
  if (result) {
    console.log("\n💾 Save this ABI encoded request for the next step!");
  } else {
    console.log("\n🔍 No matching transaction found. The payment may not have been made yet.");
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} 