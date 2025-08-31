"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Wallet, Plus, X, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const useCountdown = (deadline: number) => {
  const [timeLeft, setTimeLeft] = useState<string>("")

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(new Date().getTime() / 1000) // UTC timestamp
      const remaining = deadline - now

      if (remaining <= 0) {
        setTimeLeft("Expired")
        clearInterval(timer)
      } else {
        const hours = Math.floor(remaining / 3600)
        const minutes = Math.floor((remaining % 3600) / 60)
        const seconds = remaining % 60
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [deadline])

  return timeLeft
}

const AttestationTimer = ({
  startTime,
  onComplete,
  isSuccess,
}: { startTime: number | null; onComplete?: () => void; isSuccess?: boolean }) => {
  const [timeLeft, setTimeLeft] = useState<string>("")
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (!startTime) {
      setTimeLeft("")
      setIsComplete(false)
      return
    }

    const interval = setInterval(() => {
      const now = Math.floor(new Date().getTime() / 1000)
      const elapsed = now - startTime
      const totalTime = isSuccess ? 180 : 20 // 3 minutes for success, 20 seconds for failure
      const remaining = totalTime - elapsed

      if (remaining <= 0) {
        setTimeLeft("Complete")
        setIsComplete(true)
        onComplete?.()
        clearInterval(interval)
      } else {
        const minutes = Math.floor(remaining / 60)
        const seconds = remaining % 60
        setTimeLeft(`${minutes}m ${seconds}s`)
        setIsComplete(false)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, onComplete, isSuccess])

  if (!startTime) return null

  return (
    <Badge
      variant="outline"
      className={`${
        isComplete
          ? "bg-green-50 text-green-700 border-green-200"
          : isSuccess
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-red-50 text-red-700 border-red-200"
      }`}
    >
      <span className="font-mono text-xs">
        {isComplete ? "✅ Ready to verify" : isSuccess ? `⏳ ${timeLeft}` : `❌ ${timeLeft}`}
      </span>
    </Badge>
  )
}

const CountdownTimer = ({ deadline }: { deadline?: number }) => {
  const timeLeft = useCountdown(deadline || 0)

  if (!deadline) return null

  const isExpired = timeLeft === "Expired"
  const isNearExpiry = timeLeft.includes("0h") && !isExpired

  return (
    <span
      className={`font-mono text-xs ${
        isExpired ? "text-red-600 font-semibold" : isNearExpiry ? "text-orange-600 font-semibold" : "text-orange-700"
      }`}
    >
      {isExpired ? "⏰ Expired" : `⏱️ ${timeLeft}`}
    </span>
  )
}

// Contract ABI (simplified for the functions we need)
const CONTRACT_ABI = [
  "function postClaim(uint16 sourceChainId, bytes calldata fromAddr, bytes calldata toAddr, uint256 amount, uint32 minConfs, uint32 expirationMinutes) external payable returns (bytes32)",
  "function getClaimsCount() external view returns (uint256)",
  "function getClaimByIndex(uint256 index) external view returns (bytes32 claimId, address poster, uint256 amount, uint256 bounty, uint8 status, uint64 deadline, uint16 sourceChainId, address fromAddr, address toAddr, uint32 minConfs)",
  "function getClaim(bytes32 claimId) external view returns (tuple(uint16 sourceChainId, bytes fromAddr, bytes toAddr, uint256 amount, uint64 deadline, uint32 minConfs, address poster, uint256 bounty, uint8 status, address winner))",
  "function cancelClaim(bytes32 claimId) external",
]

// Replace with your deployed contract address on Flare Coston2 testnet
// If you haven't deployed the contract yet, you need to deploy it first
const CONTRACT_ADDRESS = "0xC0Fc58c5470d590BABD1cB2fADd61a7a99a5B45a"

const FLARE_COSTON2_NETWORK = {
  chainId: "0x72", // 114 in hex
  chainName: "Flare Testnet Coston2",
  nativeCurrency: {
    name: "Coston2 Flare",
    symbol: "C2FLR",
    decimals: 18,
  },
  rpcUrls: ["https://coston2-api.flare.network/ext/C/rpc"],
  blockExplorerUrls: ["https://coston2-explorer.flare.network/"],
}

interface Claim {
  id: string
  poster: string
  amount: string
  bounty: string
  status: number
  sourceChainId?: number
  fromAddr?: string
  toAddr?: string
  deadline?: number
  minConfs?: number
  winner?: string
}

interface FormData {
  sourceChainId: string
  fromAddr: string
  toAddr: string
  amount: string
  minConfs: string
  bounty: string
  expirationMinutes: string
}

export default function ClaimBoardDApp() {
  const [account, setAccount] = useState<string>("")
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [claims, setClaims] = useState<Claim[]>([])
  const [isVerifierMode, setIsVerifierMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [balance, setBalance] = useState<string>("")
  const [attestationRequests, setAttestationRequests] = useState<Record<string, number>>({})
  const [completedAttestations, setCompletedAttestations] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const [formData, setFormData] = useState<FormData>({
    sourceChainId: "1",
    fromAddr: "",
    toAddr: "",
    amount: "",
    minConfs: "",
    bounty: "0.001",
    expirationMinutes: "60",
  })

  const [attestationResults, setAttestationResults] = useState<Record<string, boolean>>({})
  const [showCancelledClaims, setShowCancelledClaims] = useState(false)

  const fetchBalance = async (provider: ethers.BrowserProvider, address: string) => {
    try {
      const balance = await provider.getBalance(address)
      setBalance(ethers.formatEther(balance))
    } catch (error) {
      console.error("Error fetching balance:", error)
    }
  }

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        toast({
          title: "MetaMask not found",
          description: "Please install MetaMask to use this DApp",
          variant: "destructive",
        })
        return
      }

      const provider = new ethers.BrowserProvider(window.ethereum)

      const network = await provider.getNetwork()
      if (network.chainId !== 114n) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: FLARE_COSTON2_NETWORK.chainId }],
          })
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [FLARE_COSTON2_NETWORK],
              })
            } catch (addError) {
              console.error("Error adding network:", addError)
              toast({
                title: "Network setup failed",
                description: "Failed to add Flare Coston2 network to MetaMask",
                variant: "destructive",
              })
              return
            }
          } else {
            console.error("Error switching network:", switchError)
            toast({
              title: "Network switch failed",
              description: "Failed to switch to Flare Coston2 network",
              variant: "destructive",
            })
            return
          }
        }
      }

      const accounts = await provider.send("eth_requestAccounts", [])
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)

      setProvider(provider)
      setAccount(accounts[0])
      setContract(contract)

      await fetchBalance(provider, accounts[0])

      toast({
        title: "Wallet connected",
        description: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)} on Flare Coston2`,
      })

      loadClaims(contract)
    } catch (error) {
      console.error("Error connecting wallet:", error)
      toast({
        title: "Connection failed",
        description: "Failed to connect to MetaMask",
        variant: "destructive",
      })
    }
  }

  const loadClaims = async (contractInstance?: ethers.Contract) => {
    try {
      const contractToUse = contractInstance || contract
      if (!contractToUse) return

      setIsLoading(true)

      try {
        const contractProvider = contractToUse.runner?.provider
        if (!contractProvider) {
          console.error("No provider available for contract")
          return
        }

        const code = await contractProvider.getCode(CONTRACT_ADDRESS)
        if (!code || code === "0x") {
          console.error("Contract not found at address:", CONTRACT_ADDRESS)
          toast({
            title: "Contract Not Deployed",
            description: `The ClaimBoard contract is not deployed at ${CONTRACT_ADDRESS} on Flare Coston2. Please deploy the contract first or update the CONTRACT_ADDRESS.`,
            variant: "destructive",
          })
          setClaims([]) // Clear any existing claims
          return
        }
      } catch (error) {
        console.error("Error checking contract:", error)
        toast({
          title: "Network Error",
          description: "Unable to connect to the Flare Coston2 network. Please check your connection.",
          variant: "destructive",
        })
        return
      }

      const claimsCount = await contractToUse.getClaimsCount()
      const claimsData: Claim[] = []

      for (let i = 0; i < Number(claimsCount); i++) {
        try {
          const [claimId, poster, amount, bounty, status, deadline, sourceChainId, fromAddr, toAddr, minConfs] =
            await contractToUse.getClaimByIndex(i)

          console.log("[v0] Loaded claim:", {
            id: claimId,
            deadline: Number(deadline),
            status: Number(status),
          })

          claimsData.push({
            id: claimId,
            poster: poster,
            amount: ethers.formatEther(amount),
            bounty: ethers.formatEther(bounty),
            status: Number(status),
            deadline: Number(deadline),
            sourceChainId: Number(sourceChainId),
            fromAddr: fromAddr,
            toAddr: toAddr,
            minConfs: Number(minConfs),
          })
        } catch (claimError) {
          console.error(`Error loading claim ${i}:`, claimError)
        }
      }

      setClaims(claimsData)
    } catch (error) {
      console.error("Error loading claims:", error)
      toast({
        title: "Error loading claims",
        description: "Failed to load claims from contract",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const postClaim = async () => {
    try {
      if (!contract) return

      setIsLoading(true)

      const sourceChainId = 1

      const tx = await contract.postClaim(
        sourceChainId,
        ethers.getBytes(ethers.toUtf8Bytes(formData.fromAddr)),
        ethers.getBytes(ethers.toUtf8Bytes(formData.toAddr)),
        ethers.parseEther(formData.amount),
        Number.parseInt(formData.minConfs),
        Number.parseInt(formData.expirationMinutes),
        { value: ethers.parseEther(formData.bounty) },
      )

      await tx.wait()

      if (provider && account) {
        await fetchBalance(provider, account)
      }

      toast({
        title: "Claim posted successfully",
        description: "Your claim has been posted to the blockchain",
      })

      setIsDialogOpen(false)
      setFormData({
        sourceChainId: "1",
        fromAddr: "",
        toAddr: "",
        amount: "",
        minConfs: "",
        bounty: "0.001",
        expirationMinutes: "60",
      })

      loadClaims()
    } catch (error) {
      console.error("Error posting claim:", error)
      toast({
        title: "Error posting claim",
        description: "Failed to post claim to blockchain",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const cancelClaim = async (claimId: string) => {
    try {
      if (!contract) return

      setIsLoading(true)
      const tx = await contract.cancelClaim(claimId)
      await tx.wait()

      if (provider && account) {
        await fetchBalance(provider, account)
      }

      toast({
        title: "Claim cancelled",
        description: "Your claim has been cancelled successfully",
      })

      loadClaims()
    } catch (error) {
      console.error("Error cancelling claim:", error)
      toast({
        title: "Error cancelling claim",
        description: "Failed to cancel claim",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const postAttestationRequest = (claimId: string) => {
    const now = Math.floor(new Date().getTime() / 1000)
    const isSuccess = Math.random() >= 0.5

    setAttestationRequests((prev) => ({
      ...prev,
      [claimId]: now,
    }))

    setAttestationResults((prev) => ({
      ...prev,
      [claimId]: isSuccess,
    }))

    toast({
      title: isSuccess ? "Attestation Request Posted" : "Transaction Not Found",
      description: isSuccess
        ? `3-minute verification period started for claim ${claimId.slice(0, 8)}...`
        : `TX not found for claim ${claimId.slice(0, 8)}... Retrying in 20 seconds`,
      variant: isSuccess ? "default" : "destructive",
    })
  }

  const verifyClaim = (claimId: string) => {
    toast({
      title: "Verify Claim",
      description: `Verifying claim ${claimId.slice(0, 8)}... (placeholder)`,
    })
  }

  const handleAttestationComplete = (claimId: string) => {
    const isSuccess = attestationResults[claimId]

    if (isSuccess) {
      setCompletedAttestations((prev) => new Set([...prev, claimId]))
    } else {
      setAttestationRequests((prev) => {
        const newState = { ...prev }
        delete newState[claimId]
        return newState
      })
      setAttestationResults((prev) => {
        const newState = { ...prev }
        delete newState[claimId]
        return newState
      })
    }
  }

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Open
          </Badge>
        )
      case 1:
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Resolved
          </Badge>
        )
      case 2:
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getChainName = (chainId?: number) => {
    switch (chainId) {
      case 1:
        return "Sepolia ETH"
      default:
        return `Chain ${chainId || "Unknown"}`
    }
  }

  const formatClaimId = (id: string, isVerifierMode: boolean) => {
    if (!isVerifierMode) return id
    if (id.length <= 10) return id
    return `${id.slice(0, 6)}...${id.slice(-4)}`
  }

  const getDisplayedClaims = () => {
    let filteredClaims = [...claims]

    if (!isVerifierMode && account) {
      filteredClaims = claims.filter((claim) => claim.poster.toLowerCase() === account.toLowerCase())

      if (!showCancelledClaims) {
        filteredClaims = filteredClaims.filter((claim) => claim.status !== 2)
      }
    }

    if (isVerifierMode) {
      const now = Math.floor(new Date().getTime() / 1000) // UTC timestamp
      filteredClaims = filteredClaims.filter((claim) => {
        // Keep non-expired claims or claims without deadline
        return !claim.deadline || claim.deadline > now
      })

      // Sort by bounty (highest to lowest)
      filteredClaims.sort((a, b) => Number.parseFloat(b.bounty) - Number.parseFloat(a.bounty))
    }

    return filteredClaims
  }

  const displayedClaims = getDisplayedClaims()

  useEffect(() => {
    if (!provider || !account) return

    // Initial balance fetch
    fetchBalance(provider, account)

    // Set up periodic balance updates every 30 seconds
    const balanceInterval = setInterval(() => {
      fetchBalance(provider, account)
    }, 30000)

    return () => clearInterval(balanceInterval)
  }, [provider, account])

  return (
    <div className={`min-h-screen bg-background ${isVerifierMode ? "verifier-mode" : ""}`}>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">ClaimBoard DApp</h1>
            <p className="text-muted-foreground">Decentralized claim management on Flare testnet</p>
          </div>

          <div className="flex flex-col items-end space-y-3">
            {!account ? (
              <Button onClick={connectWallet} className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Connect MetaMask
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground">
                  {balance ? `${Number.parseFloat(balance).toFixed(4)} C2FLR` : "Loading..."}
                </div>
                <Badge variant="outline" className="px-3 py-1">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </Badge>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="verifier-mode"
                checked={isVerifierMode}
                onCheckedChange={setIsVerifierMode}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
              />
              <Label htmlFor="verifier-mode" className="text-sm font-medium text-foreground">
                Verifier Mode
              </Label>
            </div>
          </div>
        </div>

        {account && !isVerifierMode && (
          <div className="mb-8">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Post New Claim
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Post New Claim</DialogTitle>
                  <DialogDescription>Submit a new claim to the blockchain</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {claims.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <div className="flex items-start">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-medium">Contract Not Found</p>
                          <p>
                            The ClaimBoard contract needs to be deployed to Flare Coston2 testnet first. Update the
                            CONTRACT_ADDRESS in the code after deployment.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sourceChainId" className="text-muted-foreground">
                        Chain
                      </Label>
                      <Input
                        id="sourceChainId"
                        value="Sepolia ETH"
                        disabled
                        className="text-muted-foreground bg-muted"
                      />
                    </div>
                    <div>
                      <Label htmlFor="minConfs">Min Confirmations</Label>
                      <Input
                        id="minConfs"
                        type="number"
                        value={formData.minConfs}
                        onChange={(e) => setFormData({ ...formData, minConfs: e.target.value })}
                        placeholder="e.g., 6"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="fromAddr">From Address</Label>
                    <Input
                      id="fromAddr"
                      value={formData.fromAddr}
                      onChange={(e) => setFormData({ ...formData, fromAddr: e.target.value })}
                      placeholder="Source address"
                    />
                  </div>

                  <div>
                    <Label htmlFor="toAddr">To Address</Label>
                    <Input
                      id="toAddr"
                      value={formData.toAddr}
                      onChange={(e) => setFormData({ ...formData, toAddr: e.target.value })}
                      placeholder="Destination address"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Amount (ETH)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.000000000000000001"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.0001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bounty">Bounty (FLR)</Label>
                      <Input
                        id="bounty"
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={formData.bounty}
                        onChange={(e) => setFormData({ ...formData, bounty: e.target.value })}
                        placeholder="0.001"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="expirationMinutes">Expiration (Minutes)</Label>
                    <Input
                      id="expirationMinutes"
                      type="number"
                      min="1"
                      value={formData.expirationMinutes}
                      onChange={(e) => setFormData({ ...formData, expirationMinutes: e.target.value })}
                      placeholder="60"
                    />
                  </div>

                  <Button onClick={postClaim} disabled={isLoading} className="w-full">
                    {isLoading ? "Posting..." : "Post Claim"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">
              {isVerifierMode ? "Claims to Verify" : "My Claims"}
            </h2>
            <div className="flex items-center gap-3">
              {!isVerifierMode && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-cancelled"
                    checked={showCancelledClaims}
                    onCheckedChange={setShowCancelledClaims}
                    className="h-4 w-4 border-2 border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="show-cancelled" className="text-xs text-muted-foreground">
                    Show cancelled
                  </Label>
                </div>
              )}
              <Badge variant="outline" className="px-3 py-1">
                {displayedClaims.length} claims
              </Badge>
            </div>
          </div>

          {isLoading && claims.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading claims...</p>
            </div>
          ) : displayedClaims.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">
                  {isVerifierMode ? "No claims found" : "No claims from your wallet"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {!account
                    ? "Connect your wallet to view and post claims"
                    : isVerifierMode
                      ? "The contract may not be deployed yet, or there are no claims posted"
                      : "You haven't posted any claims yet. Click 'Post New Claim' to get started."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {displayedClaims.map((claim) => (
                <Card key={claim.id} className="transition-all hover:shadow-md">
                  <CardContent className="px-6">
                    {isVerifierMode && (
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                        <div className="text-lg font-semibold text-primary">Bounty: {claim.bounty} FLR</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          ID: {formatClaimId(claim.id, isVerifierMode)}
                        </div>
                      </div>
                    )}

                    {!isVerifierMode && (
                      <div className="w-full mb-4">
                        <div className="text-xs text-muted-foreground font-mono break-all">
                          Claim ID: {formatClaimId(claim.id, isVerifierMode)}
                        </div>
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(claim.status)}
                          {claim.status === 0 && claim.deadline && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              <CountdownTimer deadline={claim.deadline} />
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">Poster: {claim.poster}</p>
                        <div className="flex items-center gap-4 text-sm mb-1">
                          <span>
                            Amount: <strong>{Number.parseFloat(claim.amount).toFixed(6)} ETH</strong>
                          </span>
                          {!isVerifierMode && (
                            <span>
                              Bounty: <strong>{claim.bounty} FLR</strong>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm mb-2">
                          <span className="text-muted-foreground">
                            Chain: <strong>{getChainName(claim.sourceChainId)}</strong>
                          </span>
                          {claim.minConfs && (
                            <span className="text-muted-foreground">
                              Min Confs: <strong>{claim.minConfs}</strong>
                            </span>
                          )}
                        </div>
                        {claim.fromAddr && claim.toAddr && (
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <div>
                              From: <span className="font-mono">{claim.fromAddr}</span>
                            </div>
                            <div>
                              To: <span className="font-mono">{claim.toAddr}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-4">
                      {isVerifierMode && claim.status === 0 && (
                        <>
                          {attestationRequests[claim.id] && (
                            <AttestationTimer
                              startTime={attestationRequests[claim.id]}
                              onComplete={() => handleAttestationComplete(claim.id)}
                              isSuccess={attestationResults[claim.id]}
                            />
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => postAttestationRequest(claim.id)}
                            disabled={!!attestationRequests[claim.id]}
                          >
                            {attestationRequests[claim.id]
                              ? attestationResults[claim.id]
                                ? "Request Posted"
                                : "TX not found"
                              : "Post Attestation Request"}
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => verifyClaim(claim.id)}
                            disabled={!completedAttestations.has(claim.id)}
                            className={!completedAttestations.has(claim.id) ? "opacity-50 cursor-not-allowed" : ""}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verify Claim
                          </Button>
                        </>
                      )}

                      {!isVerifierMode &&
                        account &&
                        claim.poster.toLowerCase() === account.toLowerCase() &&
                        claim.status === 0 && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => cancelClaim(claim.id)}
                            disabled={isLoading}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
