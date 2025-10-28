import { sepolia, arbitrumSepolia, optimismSepolia } from "wagmi/chains";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Droplets,
  AlertCircle,
  CheckCircle,
  Wallet,
  ExternalLink,
  Clock,
  Network,
  Loader2,
  Send,
} from "lucide-react";
import {
  useAccount,
  useBalance,
  useChainId,
  useSwitchChain,
  useReadContract,
  useWatchContractEvent,
  useWatchBlocks,
} from "wagmi";
import { getContractConfig, FAUCET_ABI } from "@/config/contract";
import { toast } from "sonner";
import { formatEther, encodePacked, keccak256 } from "viem";
import { signMessage } from "wagmi/actions";
import { wagmiConfig } from "@/config/wagmi";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

const NETWORK_CONFIGS = {
  11155111: {
    name: "Sepolia",
    chain: sepolia,
    faucetAddress: getContractConfig(11155111)?.address,
    dripAmount: 100000000000000000n,
    explorerUrl: "https://sepolia.etherscan.io",
    currency: "ETH",
    color: "bg-blue-500",
    description: "Ethereum Sepolia Testnet",
  },
  421614: {
    name: "Arbitrum Sepolia",
    chain: arbitrumSepolia,
    faucetAddress: getContractConfig(421614)?.address,
    dripAmount: 100000000000000000n,
    explorerUrl: "https://sepolia.arbiscan.io",
    currency: "ETH",
    color: "bg-blue-600",
    description: "Arbitrum Sepolia Testnet",
  },
  11155420: {
    name: "OP Sepolia",
    chain: optimismSepolia,
    faucetAddress: getContractConfig(11155420)?.address,
    dripAmount: 100000000000000000n,
    explorerUrl: "https://sepolia-optimism.etherscan.io",
    currency: "ETH",
    color: "bg-red-500",
    description: "Optimism Sepolia Testnet",
  },
} as const;

const MIN_BALANCE_THRESHOLD = 0.0001;
const COOLDOWN_SECONDS = 24 * 60 * 60;

interface ClaimHistory {
  txHash: string;
  amount: string;
  timestamp: number;
  chainId: number;
  explorerUrl: string;
}

interface NetworkStatus {
  remainingClaims: number;
  resetTime: string | null;
}

export function TestnetFaucet() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [claimHistory, setClaimHistory] = useState<ClaimHistory[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [cooldownInfo, setCooldownInfo] = useState<{
    canClaim: boolean;
    remainingSeconds?: number;
    nextClaimTime?: string;
  } | null>(null);
  const [networkStatuses, setNetworkStatuses] = useState<
    Record<number, NetworkStatus>
  >({});

  const networkConfig = chainId ? NETWORK_CONFIGS[chainId] : null;
  const isTestnet = !!networkConfig;

  useEffect(() => {
    if (address) {
      const stored = localStorage.getItem(`faucet_history_${address}`);
      if (stored) {
        try {
          setClaimHistory(JSON.parse(stored));
        } catch {
          console.error("Failed to parse claim history");
        }
      }
    }
  }, [address]);

  useEffect(() => {
    const fetchNetworkStatuses = async () => {
      try {
        const response = await fetch(`${API_URL}/networks`);
        if (!response.ok) throw new Error("Failed to fetch network statuses");
        const data = await response.json();
        setNetworkStatuses(data.networks);
      } catch (error) {
        console.error("Network fetch error:", error);
        toast.error("Network Error", {
          description: "Unable to fetch network data.",
        });
      }
    };
    fetchNetworkStatuses();
    const interval = setInterval(fetchNetworkStatuses, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkCanClaim = async () => {
      if (!address || !chainId || !isTestnet) return;
      try {
        const response = await fetch(`${API_URL}/can-claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chainId: chainId.toString(), user: address }),
        });
        if (!response.ok) throw new Error("Failed to check claim status");
        const data = await response.json();
        setCooldownInfo(data);
      } catch (error) {
        console.error("Claim status check error:", error);
      }
    };
    checkCanClaim();
    const interval = setInterval(checkCanClaim, 10000);
    return () => clearInterval(interval);
  }, [address, chainId, isTestnet]);

  const { data: balance, refetch: refetchBalance } = useBalance({ address });
  const balanceInEth = balance ? parseFloat(formatEther(balance.value)) : 0;
  const hasMinimumBalance = balanceInEth > MIN_BALANCE_THRESHOLD;

  // Real-time event listening for Drip events
  useWatchContractEvent({
    address: networkConfig?.faucetAddress,
    abi: FAUCET_ABI,
    eventName: 'Drip',
    onLogs(logs) {
      // Check if any of the events involve the current user
      const userEvents = logs.filter(log => {
        const { user } = log.args as { user: string };
        return user?.toLowerCase() === address?.toLowerCase();
      });
      
      if (userEvents.length > 0) {
        // Refresh balance immediately
        refetchBalance();
        
        // Update cooldown info
        setCooldownInfo({ canClaim: false });
        
        // Show toast notification
        const event = userEvents[0];
        const { amount } = event.args as { amount: bigint; nonce: bigint };
        
        toast.success('✨ Tokens Received!', {
          description: (
            <div className="space-y-1">
              <div>You received {formatEther(amount)} {networkConfig?.currency}</div>
              <div className="text-xs text-muted-foreground">Event detected in real-time via WebSocket</div>
            </div>
          ),
        });
      }
    },
    enabled: !!networkConfig && !!address,
  });

  useWatchContractEvent({
    address: networkConfig?.faucetAddress,
    abi: FAUCET_ABI,
    eventName: 'Deposit',
    onLogs() {
    },
    enabled: !!networkConfig,
  });

  // Real-time balance monitoring - watch for new blocks and fetch fresh balance
  const [previousBalance, setPreviousBalance] = useState<bigint | null>(null);
  
  useWatchBlocks({
    onBlock: async () => {
      if (address) {
        try {
          const freshBalance = await refetchBalance();
          
          if (freshBalance.data && previousBalance !== null) {
            const currentBalance = freshBalance.data.value;
            
            if (previousBalance !== currentBalance) {
              // Do nothing
            }
            
            setPreviousBalance(currentBalance);
          } else if (freshBalance.data && previousBalance === null) {
            setPreviousBalance(freshBalance.data.value);
          }
        } catch (error) {
          console.error('❌ Error fetching balance:', error);
        }
      }
    },
    enabled: !!address && !!networkConfig,
    poll: true,
    pollingInterval: 3000,
  });

  const { data: nonce } = useReadContract({
    address: networkConfig?.faucetAddress,
    abi: FAUCET_ABI,
    functionName: "nonces",
    args: address ? [address] : undefined,
    query: { enabled: !!networkConfig && !!address },
  });

  const { data: lastRequest } = useReadContract({
    address: networkConfig?.faucetAddress,
    abi: FAUCET_ABI,
    functionName: "lastRequest",
    args: address ? [address] : undefined,
    query: { enabled: !!networkConfig && !!address },
  });

  const dripAmount = networkConfig?.dripAmount;

  const canClaim = () => {
    if (!lastRequest) return true;
    const now = Math.floor(Date.now() / 1000);
    return now - Number(lastRequest) >= COOLDOWN_SECONDS;
  };

  const getTimeUntilNextClaim = () => {
    if (!lastRequest) return null;
    const now = Math.floor(Date.now() / 1000);
    const secondsLeft = COOLDOWN_SECONDS - (now - Number(lastRequest));
    if (secondsLeft <= 0) return null;
    const hoursLeft = Math.floor(secondsLeft / 3600);
    const minutesLeft = Math.floor((secondsLeft % 3600) / 60);
    return `${hoursLeft}h ${minutesLeft}m`;
  };

  const saveClaimHistory = (history: ClaimHistory[]) => {
    if (address) {
      localStorage.setItem(
        `faucet_history_${address}`,
        JSON.stringify(history)
      );
      setClaimHistory(history);
    }
  };

  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      switchChain({ chainId: targetChainId });
      setCooldownInfo(null);
    } catch (error) {
      console.error("Failed to switch network:", error);
      toast.error("Network Switch Failed", {
        description: "Please switch networks manually in your wallet",
      });
    }
  };

  const handleClaimFaucet = async () => {
    if (!isConnected || !address) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet first",
      });
      return;
    }
    if (!isTestnet || !networkConfig) {
      toast.error("Wrong Network", {
        description: "Please switch to a supported testnet",
      });
      return;
    }
    if (hasMinimumBalance) {
      toast.error("Sufficient Balance", {
        description: `You have ${balanceInEth.toFixed(4)} ${
          networkConfig.currency
        }. Faucet is only for wallets with less than ${MIN_BALANCE_THRESHOLD} ${
          networkConfig.currency
        }.`,
      });
      return;
    }
    if (!canClaim()) {
      toast.error("Claim Not Available", {
        description: `You can only claim once every 24 hours. Next claim available in ${getTimeUntilNextClaim()}.`,
      });
      return;
    }
    if (nonce === undefined) {
      toast.error("Nonce unavailable", {
        description: "Please try again in a moment.",
      });
      return;
    }

    setIsClaiming(true);
    try {
      const deadline = Math.floor(Date.now() / 1000) + 300;

      const messageHash = keccak256(
        encodePacked(
          ["address", "uint256", "uint256", "uint256", "address"],
          [
            address as `0x${string}`,
            BigInt(nonce),
            BigInt(deadline),
            BigInt(chainId),
            networkConfig.faucetAddress,
          ]
        )
      );

      // Sign the raw hash
      const signature = await signMessage(wagmiConfig, {
        message: { raw: messageHash },
        account: address,
      });

      // Send to relayer
      const resp = await fetch(`${API_URL}/faucet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: address,
          nonce: nonce.toString(),
          deadline: deadline.toString(),
          signature,
          chainId: chainId.toString(),
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Relayer error");

      // Add to claim history
      const newClaim: ClaimHistory = {
        txHash: data.txHash,
        amount: formatEther(dripAmount!),
        timestamp: Date.now(),
        chainId,
        explorerUrl: `${networkConfig.explorerUrl}/tx/${data.txHash}`,
      };

      saveClaimHistory([newClaim, ...claimHistory].slice(0, 10));
      setCooldownInfo({ canClaim: false });

      toast.success("🎉 Faucet Claim Successful!", {
        description: (
          <div className="space-y-2">
            <div>
              Sent {formatEther(dripAmount!)} {networkConfig.currency} to your
              wallet
            </div>
            <a
              href={`${networkConfig.explorerUrl}/tx/${data.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline"
            >
              View on {networkConfig.name} Explorer{" "}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Claim failed";

      toast.error("Transaction Failed", {
        description: message,
      });

      console.error("Claim error:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="gradient-card border-border/50 shadow-card">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-foreground">
            <Wallet className="w-5 h-5 text-primary" />
            Multi-Network Testnet Faucet
          </CardTitle>
          <CardDescription>
            Connect your wallet to claim testnet tokens across multiple networks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <Wallet className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Please connect your wallet to continue
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const canClaimNow = canClaim() && !hasMinimumBalance && isTestnet;

  return (
    <div className="space-y-6">
      <Card className="gradient-card border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Droplets className="w-5 h-5 text-primary" />
            {networkConfig
              ? `${networkConfig.name} Faucet`
              : "Multi-Network Testnet Faucet"}
          </CardTitle>
          <CardDescription>
            {networkConfig
              ? `Claim ${dripAmount ? formatEther(dripAmount) : "?"} ${
                  networkConfig.currency
                } for testing (once every 24 hours)`
              : "Switch to a supported testnet to claim tokens"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {balance && networkConfig && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {networkConfig.name} Balance: {balanceInEth.toFixed(6)}{" "}
                    {networkConfig.currency}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full ${networkConfig.color}`}
                  />
                </div>
                {networkStatuses[chainId!] && (
                  <span className="text-xs text-muted-foreground">
                    {networkStatuses[chainId!].remainingClaims} claims available
                  </span>
                )}
              </div>
            )}

            {!isTestnet && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  Select a testnet:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(NETWORK_CONFIGS).map(([id, config]) => (
                    <Button
                      key={id}
                      variant="outline"
                      onClick={() => handleSwitchNetwork(parseInt(id))}
                      className="flex items-center justify-between p-4 h-auto"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${config.color}`}
                        />
                        <div className="text-left">
                          <div className="font-medium">{config.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatEther(config.dripAmount)} {config.currency}
                          </div>
                        </div>
                      </div>
                      <Network className="w-4 h-4" />
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {isTestnet && hasMinimumBalance && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/50">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-yellow-500">
                  You have sufficient {networkConfig.currency} (
                  {balanceInEth.toFixed(4)}). Faucet is only for wallets with
                  less than {MIN_BALANCE_THRESHOLD} {networkConfig.currency}.
                </span>
              </div>
            )}

            {isTestnet &&
              !hasMinimumBalance &&
              cooldownInfo &&
              !cooldownInfo.canClaim && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/50">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-yellow-500">
                    Next claim available in {getTimeUntilNextClaim()}
                  </span>
                </div>
              )}

            {canClaimNow && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/50">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-500">
                  Ready to claim {dripAmount ? formatEther(dripAmount) : "?"}{" "}
                  {networkConfig?.currency}
                </span>
              </div>
            )}

            <Button
              onClick={handleClaimFaucet}
              disabled={!canClaimNow || isClaiming}
              className="w-full bg-[#0847f7] text-white hover:bg-[#063bbf] transition-smooth shadow-button"
              size="lg"
            >
              {isClaiming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : !isTestnet ? (
                <>
                  <Network className="w-4 h-4 mr-2" />
                  Select Testnet
                </>
              ) : (
                <>
                  <Droplets className="w-4 h-4 mr-2" />
                  Claim {dripAmount ? formatEther(dripAmount) : "?"}{" "}
                  {networkConfig?.currency}
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              {networkConfig
                ? `This faucet provides test ${networkConfig.currency} for ${networkConfig.name} only`
                : "Connect to any supported testnet to claim free tokens"}
            </p>
          </div>
        </CardContent>
      </Card>

      {claimHistory.length > 0 && (
        <Card className="gradient-card border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Send className="w-5 h-5 text-primary" />
              Recent Claims
            </CardTitle>
            <CardDescription>
              Your recent faucet claims across all networks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {claimHistory.map((claim, i) => {
                const config = NETWORK_CONFIGS[claim.chainId];
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          config?.color || "bg-gray-500"
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            +{claim.amount} {config?.currency || "TOKEN"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            on {config?.name || "Unknown Network"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(claim.timestamp).toLocaleDateString()} at{" "}
                          {new Date(claim.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <a
                      href={claim.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="gradient-card border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Network className="w-5 h-5 text-primary" />
            Supported Networks
          </CardTitle>
          <CardDescription>
            All testnets supported by this faucet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(NETWORK_CONFIGS).map(([id, config]) => (
              <div
                key={id}
                className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${config.color}`} />
                  <span className="font-medium">{config.name}</span>
                  {chainId === parseInt(id) && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                      Connected
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {config.description}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>
                    Drip: {formatEther(config.dripAmount)} {config.currency}
                  </span>
                  <a
                    href={config.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
