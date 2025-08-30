// submit-attestation.ts
import "dotenv/config";
import { Contract, JsonRpcProvider, Wallet } from "ethers";

const RPC = "https://coston2-api.flare.network/ext/C/rpc";
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const ABI_REQUEST = process.env.ABI_REQUEST!; // paste your blob or set as env var

async function main() {
  if (!PRIVATE_KEY || !ABI_REQUEST) {
    throw new Error("Set PRIVATE_KEY and ABI_REQUEST env vars");
  }

  const provider = new JsonRpcProvider(RPC);
  const wallet = new Wallet(PRIVATE_KEY, provider);

  // Fee contract to get the required fee
  const FEE_CONTRACT = "0x191a1282Ac700edE65c5B0AaF313BAcC3eA7fC7e";
  const FEE_ABI = [
    "function getRequestFee(bytes calldata _data) external view returns (uint256)",
  ];
  const feeContract = new Contract(FEE_CONTRACT, FEE_ABI, provider);

  // Hub contract to submit the attestation request
  const HUB_CONTRACT = "0x48aC463d7975828989331F4De43341627b9c5f1D";
  const HUB_ABI = [
    "function requestAttestation(bytes calldata _data) external payable",
  ];
  const hubContract = new Contract(HUB_CONTRACT, HUB_ABI, wallet);

  // Get the required fee from the fee contract
  const fee: bigint = await feeContract
    .getFunction("getRequestFee")
    .staticCall(ABI_REQUEST);
  console.log("Fee required:", fee.toString());

  // Optional: dry run to check if the transaction will succeed
  await hubContract
    .getFunction("requestAttestation")
    .staticCall(ABI_REQUEST, { value: fee });

  // Send the transaction
  const tx = await hubContract.getFunction("requestAttestation")(ABI_REQUEST, {
    value: fee,
    gasLimit: 500_000n,
  });
  console.log("Submitted tx:", tx.hash);

  const rcpt = await tx.wait();
  console.log("Mined in block:", rcpt.blockNumber);

  const block = await provider.getBlock(rcpt.blockNumber);
  console.log("Block timestamp:", block?.timestamp);
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
