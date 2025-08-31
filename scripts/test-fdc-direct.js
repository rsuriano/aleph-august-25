// Vamos a generar el calldata exacto que necesitamos para llamar FDC con cast
const { ethers } = require('ethers');

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

console.log("🔍 Analyzing the difference between ethers.js and our contract call...\n");

console.log("📋 Proof data structure:");
console.log("- Merkle proof length:", PROOF_DATA.proof.length);
console.log("- Attestation type:", PROOF_DATA.response.attestationType);
console.log("- Source ID:", PROOF_DATA.response.sourceId);
console.log("- Voting round:", PROOF_DATA.response.votingRound);
console.log("- TX hash:", PROOF_DATA.response.requestBody.transactionHash);

console.log("\n🤔 Key differences to investigate:");
console.log("1. Gas limit - ethers.js vs contract call");
console.log("2. Call context - external vs internal call");
console.log("3. Data encoding - ethers vs solidity ABI encoding");

console.log("\n💡 Next steps:");
console.log("1. Try calling FDC directly with cast");
console.log("2. Compare gas usage between ethers.js and contract");
console.log("3. Check if FDC has restrictions on contract calls");

// Generate the cast command
const fdcAddress = "0x075bf301fF07C4920e5261f93a0609640F53487D";
const functionSig = "verifyEVMTransaction((bytes32[],(bytes32,bytes32,uint64,uint64,(bytes32,uint16,bool,bool,uint32[]),(uint64,uint64,address,bool,address,uint256,bytes,uint8,tuple[]))))";

console.log("\n🔧 Cast command to test:");
console.log(`cast call ${fdcAddress} "${functionSig}" ...`);
console.log("\n⚠️  This is complex to encode manually with cast");
console.log("The issue might be that our contract encoding is different from ethers.js encoding");

console.log("\n🎯 HYPOTHESIS:");
console.log("The FDC verification works fine, but there's a subtle difference in how");
console.log("Solidity encodes the struct vs how ethers.js encodes it.");
console.log("This could be related to:");
console.log("- Struct packing");
console.log("- Array encoding"); 
console.log("- Event array handling (we simplified to empty array)"); 