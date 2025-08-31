// Check exact addresses from the proof data we're using
const PROOF_DATA = {
  "response": {
    "responseBody": {
      "sourceAddress": "0xd1c157cbf1a0ce6064ad9f733261364e1ed8fc66",
      "receivingAddress": "0x08d2b0a37f869ff76bacb5bab3278e26ab7067b7",
      "value": 100000000000000
    }
  }
};

console.log("🔍 Proof addresses analysis:");
console.log("- Source (from):", PROOF_DATA.response.responseBody.sourceAddress);
console.log("- Receiving (to):", PROOF_DATA.response.responseBody.receivingAddress);
console.log("- Value:", PROOF_DATA.response.responseBody.value);

console.log("\n📋 What we put in the claim:");
console.log("- From: 0xd1c157cbf1a0ce6064ad9f733261364e1ed8fc66");
console.log("- To:   0x08d2b0a37f869ff76bacb5bab3278e26ab7067b7");
console.log("- Value: 100000000000000");

console.log("\n✅ Exact match check:");
console.log("- From matches:", PROOF_DATA.response.responseBody.sourceAddress === "0xd1c157cbf1a0ce6064ad9f733261364e1ed8fc66");
console.log("- To matches:  ", PROOF_DATA.response.responseBody.receivingAddress === "0x08d2b0a37f869ff76bacb5bab3278e26ab7067b7");
console.log("- Value matches:", PROOF_DATA.response.responseBody.value === 100000000000000);

// Check if it's a case sensitivity issue
console.log("\n🔤 Case sensitivity check:");
console.log("- From (lower):", PROOF_DATA.response.responseBody.sourceAddress.toLowerCase());
console.log("- To (lower):  ", PROOF_DATA.response.responseBody.receivingAddress.toLowerCase());
console.log("- Claim from:  ", "0xd1c157cbf1a0ce6064ad9f733261364e1ed8fc66".toLowerCase());
console.log("- Claim to:    ", "0x08d2b0a37f869ff76bacb5bab3278e26ab7067b7".toLowerCase());

console.log("\n✅ Case-insensitive match:");
console.log("- From matches:", PROOF_DATA.response.responseBody.sourceAddress.toLowerCase() === "0xd1c157cbf1a0ce6064ad9f733261364e1ed8fc66".toLowerCase());
console.log("- To matches:  ", PROOF_DATA.response.responseBody.receivingAddress.toLowerCase() === "0x08d2b0a37f869ff76bacb5bab3278e26ab7067b7".toLowerCase()); 