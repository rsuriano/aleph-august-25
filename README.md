# ClaimBoard

Sistema de claims cross-chain deployado en Flare Coston2 testnet.

## Setup Rápido

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundry-up

# Install Node.js dependencies (en carpeta client)
cd client && npm install
```

## Desarrollo Local

### Anvil (Local Blockchain)
```bash
# Iniciar Anvil
anvil --port 8545 &

# Deployar contrato localmente
forge create --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 ClaimBoard --broadcast

# Transferir fondos a tu dirección
cast send 0x644ab44d11114bdf737039fee77e0028a774fa73 --value 2ether --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url http://localhost:8545
```

### Build & Test
```bash
# Compilar contrato
forge build

# Crear tests (si existen)
forge test
```

## Coston2 Testnet

### Deploy
```bash
# Deployar a Coston2
forge create --rpc-url https://coston2-api.flare.network/ext/C/rpc --private-key YOUR_PRIVATE_KEY ClaimBoard --broadcast
```

### Interacciones con Cast
```bash
# Ver número de claims
cast call CONTRACT_ADDRESS "getClaimsCount()" --rpc-url https://coston2-api.flare.network/ext/C/rpc

# Crear claim via cast
cast send CONTRACT_ADDRESS "postClaim(uint16,bytes,bytes,uint256,uint32)" 1 "0x" "0x1234" 1000000000000000000 6 --value 0.1ether --private-key YOUR_PRIVATE_KEY --rpc-url https://coston2-api.flare.network/ext/C/rpc

# Obtener claim por ID
cast call CONTRACT_ADDRESS "getClaim(bytes32)" CLAIM_ID --rpc-url https://coston2-api.flare.network/ext/C/rpc

# Obtener claim por índice
cast call CONTRACT_ADDRESS "getClaimByIndex(uint256)" 0 --rpc-url https://coston2-api.flare.network/ext/C/rpc
```

## Backend API

### Setup
```bash
cd client
cp env.example .env
# Editar .env con tus valores:
# CONTRACT_ADDRESS=0xe0f5a214207Fe23f7F4ED680FC654E827c9D1D32
# RPC_URL=https://coston2-api.flare.network/ext/C/rpc
# DEFAULT_CHAIN_ID=114

# Iniciar servidor
npm start
```

### Endpoints
- `GET /claims` - Todos los claims ✅
- `GET /claim/:claimId` - Claim específico ⚠️ **NO funciona en Coston2** (opcode 0x5e)
- `POST /claim` - Crear nuevo claim ✅
- `POST /claim/:claimId/verify-payment` - Verificar pago ✅
- `POST /claim/:claimId/cancel` - Cancelar claim ✅

## Contratos Deployados

- **Coston2 Testnet**: `0xe0f5a214207Fe23f7F4ED680FC654E827c9D1D32`
- **Chain ID**: 114
- **RPC**: `https://coston2-api.flare.network/ext/C/rpc`

## Funciones Principales

- `postClaim()` - Crear claim (deadline automático) ✅
- `getClaim()` - Obtener claim por ID ⚠️ **NO funciona en Coston2**
- `getClaimsCount()` - Número total de claims ✅
- `getClaimByIndex()` - Claim por índice (compatible con Coston2) ✅

## Limitaciones Conocidas

### Coston2 Testnet
- **`getClaim()` no funciona**: Error `opcode 0x5e not defined`
- **Causa**: Structs complejos no son compatibles con el EVM de Coston2
- **Solución**: Usar `getClaimByIndex()` y `getClaimsCount()` como alternativa
- **Funciona en**: Anvil local, Ethereum mainnet, otras redes EVM compatibles 