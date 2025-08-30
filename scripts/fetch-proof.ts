import "dotenv/config";

const API =
  "https://ctn2-data-availability.flare.network/api/v1/fdc/proof-by-request-round";
const API_KEY = "00000000-0000-0000-0000-000000000000"; // test key
const VOTING_ROUND_ID = process.env.VOTING_ROUND_ID; // your round id
const REQUEST_BYTES = process.env.ABI_REQUEST; // your abiEncodedRequest blob

async function main() {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({
      votingRoundId: VOTING_ROUND_ID,
      requestBytes: REQUEST_BYTES,
    }),
  });

  if (!res.ok) {
    console.error("HTTP error", res.status, await res.text());
    process.exit(1);
  }

  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

main().catch(console.error);
