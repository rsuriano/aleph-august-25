# Aleph Client

Simple JavaScript client for interacting with the Counter smart contract.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
   
   Copy the example file and update it:
   ```bash
   cp env.example .env
   # Edit .env with your values
   ```
   
   Or set them manually:
   ```bash
   export CONTRACT_ADDRESS="0x..." # Your deployed contract address
   export RPC_URL="https://..." # Your RPC endpoint
   export PRIVATE_KEY="0x..." # Your wallet private key (optional)
   ```

## Usage

Start the server:
```bash
npm start
# or for development
npm run dev
```

## Endpoints

- `GET /number` - Get current counter value
- `POST /set-number` - Set counter to specific value
  - Body: `{ "newNumber": 42, "privateKey": "0x..." }`
- `POST /increment` - Increment counter by 1
  - Body: `{ "privateKey": "0x..." }`

## Example Requests

```bash
# Get current number
curl http://localhost:3000/number

# Set number to 42
curl -X POST http://localhost:3000/set-number \
  -H "Content-Type: application/json" \
  -d '{"newNumber": 42, "privateKey": "0x..."}'

# Increment number
curl -X POST http://localhost:3000/increment \
  -H "Content-Type: application/json" \
  -d '{"privateKey": "0x..."}'
``` 