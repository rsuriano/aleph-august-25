const { ethers } = require('ethers');

// Test address conversion
const fromAddr = "0xd1c157cbf1a0ce6064ad9f733261364e1ed8fc66";
const toAddr = "0x08d2b0a37f869ff76bacb5bab3278e26ab7067b7";

console.log("🔍 Address Analysis:");
console.log("Original addresses:");
console.log("- From:", fromAddr);
console.log("- To:  ", toAddr);

console.log("\nAs bytes (how we store in contract):");
console.log("- From bytes:", fromAddr);
console.log("- To bytes:  ", toAddr);

console.log("\nLength check:");
console.log("- From length:", fromAddr.length, "(should be 42 with 0x)");
console.log("- To length:  ", toAddr.length, "(should be 42 with 0x)");

console.log("\nWithout 0x prefix:");
console.log("- From:", fromAddr.slice(2));
console.log("- To:  ", toAddr.slice(2));

console.log("\nAs checksummed addresses:");
console.log("- From:", ethers.getAddress(fromAddr));
console.log("- To:  ", ethers.getAddress(toAddr));

// Test the conversion logic similar to what the contract does
function bytesToAddress(hexString) {
  // Remove 0x if present
  const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
  
  // Pad to 32 bytes (64 hex chars) if needed
  const padded = hex.padStart(64, '0');
  
  // Take the last 20 bytes (40 hex chars) for address
  const addressHex = padded.slice(-40);
  
  return '0x' + addressHex;
}

console.log("\n🧪 Simulating contract conversion:");
console.log("- From converted:", bytesToAddress(fromAddr));
console.log("- To converted:  ", bytesToAddress(toAddr));

console.log("\n📋 Proof data addresses:");
console.log("- Proof from:", "0xd1c157cbf1a0ce6064ad9f733261364e1ed8fc66");
console.log("- Proof to:  ", "0x08d2b0a37f869ff76bacb5bab3278e26ab7067b7");

console.log("\n✅ Addresses match:", 
  ethers.getAddress(fromAddr) === ethers.getAddress("0xd1c157cbf1a0ce6064ad9f733261364e1ed8fc66") &&
  ethers.getAddress(toAddr) === ethers.getAddress("0x08d2b0a37f869ff76bacb5bab3278e26ab7067b7")
); 