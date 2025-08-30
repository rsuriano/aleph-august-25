import "dotenv/config";
import { Contract, JsonRpcProvider, Wallet } from "ethers";

// Resolve FdcVerification via the registry (bytes32 name "FdcVerification") or hardcode:
const FDC_CONTRACT = "0x075bf301fF07C4920e5261f93a0609640F53487D";
const RPC = "https://coston2-api.flare.network/ext/C/rpc";
const PRIVATE_KEY = process.env.PRIVATE_KEY!;

const IFDC_ABI = [
  "function verifyEVMTransaction((bytes32[] merkleProof, (bytes32 attestationType, bytes32 sourceId, uint64 votingRound, uint64 lowestUsedTimestamp, (bytes32 transactionHash, uint16 requiredConfirmations, bool provideInput, bool listEvents, uint32[] logIndices) requestBody, (uint64 blockNumber, uint64 timestamp, address sourceAddress, bool isDeployment, address receivingAddress, uint256 value, bytes input, uint8 status, (uint32 logIndex, address emitterAddress, bytes32[] topics, bytes data, bool removed)[] events) responseBody) data)) view returns (bool)",
];

async function main() {
  const provider = new JsonRpcProvider(RPC);
  const wallet = new Wallet(PRIVATE_KEY, provider);

  // First, let's check if the contract exists at this address
  const code = await provider.getCode(FDC_CONTRACT);
  if (code === "0x") {
    throw new Error(`No contract found at address ${FDC_CONTRACT}`);
  }
  console.log("Contract exists at address:", FDC_CONTRACT);

  const fdc = new Contract(FDC_CONTRACT, IFDC_ABI, wallet);

  // Let's also check if we can call a simple view function to verify the contract is working
  try {
    // Try to get the contract's bytecode to verify it's the right contract
    const bytecode = await provider.getCode(FDC_CONTRACT);
    console.log("Contract bytecode length:", bytecode.length);
  } catch (error) {
    console.log("Error getting contract bytecode:", error);
  }

  const da = {
    response: {
      attestationType:
        "0x45564d5472616e73616374696f6e000000000000000000000000000000000000",
      sourceId:
        "0x7465737445544800000000000000000000000000000000000000000000000000",
      votingRound: 1090506,
      lowestUsedTimestamp: 1756558896,
      requestBody: {
        transactionHash:
          "0x9677b2eab721d53f34f60ad0c9e0730bd480d248a1c0421c2724f1cf0d3bb2d3",
        requiredConfirmations: 2,
        provideInput: false,
        listEvents: true,
        logIndices: [],
      },
      responseBody: {
        blockNumber: 9096518,
        timestamp: 1756558896,
        sourceAddress: "0xd1c157cbf1a0ce6064ad9f733261364e1ed8fc66",
        isDeployment: false,
        receivingAddress: "0x08d2b0a37f869ff76bacb5bab3278e26ab7067b7",
        value: 100000000000000,
        input: "0x00",
        status: 1,
        events: [
          // {
          //   logIndex: 0,
          //   emitterAddress: "0x0000000000000000000000000000000000000000",
          //   topics: [],
          //   data: "0x",
          //   removed: false,
          // },
        ],
      },
    },
    proof: [
      "0x88e24bd34d4e9e93dd6b1747c74dfe26573cb46acbf7eb53bc05c4e0a685760c",
      "0xf6a95795dcd4ebc724bcfe1fae8c80f0cca8c01e07b6be5b0c1965b8db86a92a",
      "0x3ff38fb6c430759518f5889d5fdffa6c4bdebdb19ce2fbb1929717a9f6662ab2",
      "0xc38dd1a30d6b8e0483ed885499efbb8609168bfab2714a2b0fbd29e03f5a1afb",
    ],
  };

  const proof = {
    merkleProof: da.proof,
    data: {
      attestationType: da.response.attestationType,
      sourceId: da.response.sourceId,
      votingRound: da.response.votingRound,
      lowestUsedTimestamp: da.response.lowestUsedTimestamp,
      requestBody: da.response.requestBody,
      responseBody: da.response.responseBody,
    },
  };

  console.log("Sending data to contract:");
  console.log("- attestationType:", da.response.attestationType);
  console.log("- sourceId:", da.response.sourceId);
  console.log("- votingRound:", da.response.votingRound);
  console.log("- transactionHash:", da.response.requestBody.transactionHash);
  console.log("- merkleProof length:", da.proof.length);
  console.log("- merkleProof:", da.proof);

  try {
    const ok: boolean = await fdc
      .getFunction("verifyEVMTransaction")
      .staticCall(proof);
    console.log("proof ok?", ok);
  } catch (error) {
    console.log("Contract call failed. This could mean:");
    console.log("1. The voting round is not finalized yet");
    console.log("2. The merkle proof is invalid");
    console.log("3. The data doesn't match what was actually attested");
    console.log("4. The attestation was not included in this voting round");
    throw error;
  }
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
