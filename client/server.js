require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ClaimBoard Contract ABI - just the essential functions
const contractABI = [
  "function postClaim(uint16 sourceChainId, bytes calldata fromAddr, bytes calldata toAddr, uint256 amount, uint64 deadline, uint32 minConfs) external payable returns (bytes32)",
  "function verifyPayment(bytes32 claimId) public",
  "function verifyNonExistence(bytes32 claimId) public", 
  "function cancelClaim(bytes32 claimId) public"
];

// Contract address - you'll need to update this after deployment
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Provider - update with your network details
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// Contract instance
const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

// Get contract info
app.get('/contract-info', async (req, res) => {
  try {
    const address = await contract.getAddress();
    const balance = await provider.getBalance(address);
    
    res.json({
      contractAddress: address,
      contractBalance: ethers.formatEther(balance),
      network: (await provider.getNetwork()).name
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Post a new claim
app.post('/claim', async (req, res) => {
  try {
    const { 
      sourceChainId, 
      fromAddr, 
      toAddr, 
      amount, 
      deadline, 
      minConfs, 
      bounty,
      privateKey 
    } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({ error: 'Private key required' });
    }

    if (!sourceChainId || !toAddr || !amount || !deadline || !minConfs || !bounty) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const contractWithSigner = contract.connect(wallet);
    
    const bountyWei = ethers.parseEther(bounty.toString());
    const deadlineUint64 = BigInt(deadline);
    
    const tx = await contractWithSigner.postClaim(
      sourceChainId,
      fromAddr || "0x",
      toAddr,
      amount,
      deadlineUint64,
      minConfs,
      { value: bountyWei }
    );
    
    await tx.wait();
    
    const claimId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint16', 'bytes', 'bytes', 'uint256', 'uint64', 'uint32', 'address'],
        [sourceChainId, fromAddr || "0x", toAddr, amount, deadlineUint64, minConfs, wallet.address]
      )
    );
    
    res.json({ 
      success: true, 
      transactionHash: tx.hash,
      claimId: claimId,
      bounty: bounty
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify payment (resolve claim)
app.post('/claim/:claimId/verify-payment', async (req, res) => {
  try {
    const { claimId } = req.params;
    const { privateKey } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({ error: 'Private key required' });
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const contractWithSigner = contract.connect(wallet);
    
    const tx = await contractWithSigner.verifyPayment(claimId);
    await tx.wait();
    
    res.json({ 
      success: true, 
      transactionHash: tx.hash,
      claimId: claimId,
      action: 'payment_verified'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify non-existence (resolve claim)
app.post('/claim/:claimId/verify-non-existence', async (req, res) => {
  try {
    const { claimId } = req.params;
    const { privateKey } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({ error: 'Private key required' });
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const contractWithSigner = contract.connect(wallet);
    
    const tx = await contractWithSigner.verifyNonExistence(claimId);
    await tx.wait();
    
    res.json({ 
      success: true, 
      transactionHash: tx.hash,
      claimId: claimId,
      action: 'non_existence_verified'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel claim
app.post('/claim/:claimId/cancel', async (req, res) => {
  try {
    const { claimId } = req.params;
    const { privateKey } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({ error: 'Private key required' });
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const contractWithSigner = contract.connect(wallet);
    
    const tx = await contractWithSigner.cancelClaim(claimId);
    await tx.wait();
    
    res.json({ 
      success: true, 
      transactionHash: tx.hash,
      claimId: claimId,
      action: 'claim_cancelled'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Contract address: ${CONTRACT_ADDRESS}`);
  console.log(`RPC URL: ${process.env.RPC_URL}`);
}); 