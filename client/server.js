require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Contract ABI - just the functions we need
const contractABI = [
  "function number() public view returns (uint256)",
  "function setNumber(uint256 newNumber) public",
  "function increment() public"
];

// Contract address - you'll need to update this after deployment
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Provider - update with your network details
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// Contract instance
const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

// Get current number
app.get('/number', async (req, res) => {
  try {
    const number = await contract.number();
    res.json({ number: number.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set number (requires private key for signing)
app.post('/set-number', async (req, res) => {
  try {
    const { newNumber, privateKey } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({ error: 'Private key required' });
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const contractWithSigner = contract.connect(wallet);
    
    const tx = await contractWithSigner.setNumber(newNumber);
    await tx.wait();
    
    res.json({ 
      success: true, 
      transactionHash: tx.hash,
      newNumber: newNumber 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Increment number (requires private key for signing)
app.post('/increment', async (req, res) => {
  try {
    const { privateKey } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({ error: 'Private key required' });
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const contractWithSigner = contract.connect(wallet);
    
    const tx = await contractWithSigner.increment();
    await tx.wait();
    
    res.json({ 
      success: true, 
      transactionHash: tx.hash 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Contract address: ${CONTRACT_ADDRESS}`);
}); 