require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const contractABI = [
  "function postClaim(uint16 sourceChainId, bytes calldata fromAddr, bytes calldata toAddr, uint256 amount, uint32 minConfs) external payable returns (bytes32)",
  "function getClaim(bytes32 claimId) external view returns (tuple(uint16 sourceChainId, bytes fromAddr, bytes toAddr, uint256 amount, uint64 deadline, uint32 minConfs, address poster, uint256 bounty, uint8 status, address winner))",
  "function verifyPayment(bytes32 claimId) external",
  "function verifyNonExistence(bytes32 claimId) external", 
  "function cancelClaim(bytes32 claimId) external"
];

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
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

// Get claim information
app.get('/claim/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;
    const claim = await contract.getClaim(claimId);
    
    res.json({
      claimId: claimId,
      claim: {
        sourceChainId: Number(claim[0]),
        fromAddr: claim[1],
        toAddr: claim[2],
        amount: claim[3].toString(),
        deadline: Number(claim[4]),
        minConfs: Number(claim[5]),
        poster: claim[6],
        bounty: ethers.formatEther(claim[7]),
        status: Number(claim[8]), // 0=Open, 1=Resolved, 2=Cancelled
        winner: claim[9]
      }
    });
  } catch (error) {
    // Contract will revert with ClaimNotFound if claim doesn't exist
    if (error.message.includes('ClaimNotFound') || error.message.includes('0x0455eeee')) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Post a new claim
app.post('/claim', async (req, res) => {
  try {
    const { sourceChainId, fromAddr, toAddr, amount, minConfs, bounty, privateKey } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({ error: 'Private key required' });
    }

    if (!sourceChainId || !toAddr || !amount || !minConfs || !bounty) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const contractWithSigner = contract.connect(wallet);
    
    const bountyWei = ethers.parseEther(bounty.toString());
    
    // Call the contract function - it returns the claimId directly
    const claimId = await contractWithSigner.postClaim.staticCall(
      sourceChainId,
      fromAddr || "0x",
      toAddr,
      amount,
      minConfs,
      { value: bountyWei }
    );
    
    // Now execute the actual transaction
    const tx = await contractWithSigner.postClaim(
      sourceChainId,
      fromAddr || "0x",
      toAddr,
      amount,
      minConfs,
      { value: bountyWei }
    );
    
    await tx.wait();
    
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

// Verify payment
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

// Verify non-existence
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
}); 