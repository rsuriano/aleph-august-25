# ClaimBoard API Client

A simple Express.js backend for interacting with the ClaimBoard smart contract. This allows users to post claims, verify payments, and manage bounties through a REST API.

## Features

- **Post Claims**: Create new claims with bounties for payment verification
- **Verify Payments**: Resolve claims when payments are verified
- **Verify Non-Existence**: Resolve claims when payments are confirmed to not exist
- **Cancel Claims**: Allow posters to cancel claims and get refunds

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file and configure:
```bash
cp env.example .env
```

3. Update `.env` with your values:
```bash
RPC_URL=https://coston2-api.flare.network/ext/C/rpc
CONTRACT_ADDRESS=0x... # Your deployed ClaimBoard contract address
```

4. Start the server:
```bash
npm start
# or for development
npm run dev
```

## API Endpoints

### `GET /contract-info`
Get contract information including address, balance, and network.

### `POST /claim`
Post a new claim with bounty.

**Body:**
```json
{
  "sourceChainId": 1,
  "fromAddr": "0x1234",
  "toAddr": "0x5678",
  "amount": "1000000",
  "deadline": "1756656000",
  "minConfs": 6,
  "bounty": "0.1",
  "privateKey": "YOUR_PRIVATE_KEY"
}
```

### `POST /claim/:claimId/verify-payment`
Verify payment and resolve claim (requires private key).

### `POST /claim/:claimId/verify-non-existence`
Verify non-existence and resolve claim (requires private key).

### `POST /claim/:claimId/cancel`
Cancel a claim and get bounty refund (requires poster's private key).

## Testing

Use the `api-examples.http` file with VS Code REST Client or similar tools to test the API endpoints.

## Security Notes

- **Never expose private keys** in production
- Use environment variables for sensitive data
- Consider implementing proper authentication for production use
- Private keys are only needed for transaction signing

## Contract Integration

This backend integrates with the ClaimBoard smart contract which:
- Escrows bounties in ETH
- Manages claim lifecycle (Open → Resolved/Cancelled)
- Handles bounty distribution to winners
- Provides refunds for cancelled claims 