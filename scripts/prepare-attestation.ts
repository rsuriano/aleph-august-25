import "dotenv/config";

/**
 * Run:
 *   VERIFIER_BASE=https://fdc-verifiers-testnet.flare.network \
 *   VERIFIER_API_KEY=00000000-0000-0000-0000-000000000000 \
 *   SOURCE_NAME=eth \        // e.g. eth | polygon | bsc (testnet names vary: eth-sepolia, etc.)
 *   TX_HASH=0x... \
 *   ts-node prepare-evmtransaction-request.ts
 */

type PrepareReqBody = {
  attestationType: string; // 32-byte hex
  sourceId: string; // 32-byte hex (UTF-8 padded for the chain key the verifier expects)
  requestBody: {
    transactionHash: string;
    requiredConfirmations: string; // decimal number as string or 0x-prefixed hex string
    provideInput: boolean;
    listEvents: boolean;
    logIndices: number[]; // block-level log indices (sorted, unique)
  };
};

type PrepareResp =
  | { status: "VALID"; abiEncodedRequest: `0x${string}` }
  | { status: "INVALID"; reason?: string; details?: unknown };

const {
  VERIFIER_BASE = "https://fdc-verifiers-testnet.flare.network",
  VERIFIER_API_KEY = "00000000-0000-0000-0000-000000000000",
  SOURCE_NAME = "eth", // path segment used by the verifier (e.g., "eth" for Ethereum mainnet or test env)
  TX_HASH,
} = process.env;

if (!TX_HASH) {
  console.error(
    "Please set TX_HASH env var to the transaction hash you want to attest."
  );
  process.exit(1);
}

/** Turn an ASCII string into 32-byte, right-padded hex (UTF-8), as required by the verifier. */
function toBytes32Utf8Padded(str: string): string {
  const enc = new TextEncoder().encode(str);
  if (enc.length > 32) throw new Error(`String too long for bytes32: "${str}"`);
  const bytes = new Uint8Array(32);
  bytes.set(enc, 0);
  return "0x" + Buffer.from(bytes).toString("hex");
}

/** Basic params — adjust as needed */
const REQUIRED_CONFIRMS = 2; // testnets: 1–3; mainnet: 6–12+
const PROVIDE_INPUT = true; // true if you need tx input data
const LIST_EVENTS = false; // true to include logs
const LOG_INDICES: number[] = []; // [] -> all logs for this tx (max limits may apply)

/**
 * IMPORTANT:
 * - attestationType must be the 32-byte id for "EVMTransaction" (UTF-8, padded)
 * - sourceId must match the verifier’s expected 32-byte key for the source chain.
 *   For Sepolia test envs, verifiers often expect something like "testETH" (confirm in your env).
 */
const ATTESTATION_TYPE_EVM_TX = toBytes32Utf8Padded("EVMTransaction");
// Examples; pick the one your verifier expects. If unsure, start with "ETH" for mainnet or "testETH" for Sepolia.
const SOURCE_ID = toBytes32Utf8Padded("testETH"); // or toBytes32Utf8Padded("ETH")

async function main() {
  const url = `${VERIFIER_BASE}/verifier/${SOURCE_NAME}/EVMTransaction/prepareRequest`;

  const body: PrepareReqBody = {
    attestationType: ATTESTATION_TYPE_EVM_TX,
    sourceId: SOURCE_ID,
    requestBody: {
      transactionHash: TX_HASH!,
      requiredConfirmations: REQUIRED_CONFIRMS.toString(),
      provideInput: PROVIDE_INPUT,
      listEvents: LIST_EVENTS,
      logIndices: LIST_EVENTS ? LOG_INDICES : [], // must be empty if listEvents=false
    },
  };

  // Quick client-side sanity checks
  if (!/^0x[0-9a-fA-F]{64}$/.test(TX_HASH!)) {
    throw new Error("TX_HASH must be a 32-byte hex (0x + 64 hex chars).");
  }
  if (!LIST_EVENTS && LOG_INDICES.length > 0) {
    throw new Error("When listEvents=false, logIndices must be empty.");
  }
  if (LIST_EVENTS && LOG_INDICES.length > 1) {
    // keep indices sorted/unique (block-level logIndex)
    body.requestBody.logIndices = Array.from(new Set(LOG_INDICES)).sort(
      (a, b) => a - b
    );
  }

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
    console.error("Verifier rejected the request:", json);
    process.exit(1);
  }

  console.log("\nabiEncodedRequest:");
  console.log(json.abiEncodedRequest); // <-- Save this; you’ll submit it on-chain next step.
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
