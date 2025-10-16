import { ConnectButton } from "@rainbow-me/rainbowkit";
import { TestnetFaucet } from "@/components/web3/TestnetFaucet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAccount } from "wagmi";
import { Droplets, Github, Shield, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <div className="p-2 rounded-xl bg-[#0847f7] shadow-lg">
                <Droplets className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-[#0847f7]">
                Multi-Network Faucet
              </h1>
            </div>
            <div className="flex items-center gap-2 justify-center sm:justify-end">
              <Button
                variant="outline"
                size="icon"
                asChild
                className="hover:bg-primary hover:text-primary-foreground"
              >
                <a
                  href="https://github.com/Shiva-Sai-ssb/faucet-contract"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View on GitHub"
                >
                  <Github className="h-4 w-4" />
                </a>
              </Button>
              <ThemeToggle />
              <ConnectButton
                showBalance={{ smallScreen: false, largeScreen: true }}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-12">
          {!isConnected ? (
            <>
              {/* Hero Section - Only show when not connected */}
              <div className="hero-section relative py-12 px-4 text-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 opacity-50" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

                <div className="relative z-10 max-w-2xl mx-auto">
                  <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground leading-tight">
                    Multi-Network Testnet Faucet
                  </h1>
                  <p className="text-lg md:text-xl text-muted-foreground mb-3">
                    Claim testnet ETH across Sepolia, Arbitrum, and Optimism
                    networks
                  </p>
                  <p className="text-sm md:text-base text-muted-foreground/90">
                    Contract-based faucet with gasless transactions - our
                    relayer covers all gas fees
                  </p>
                </div>
              </div>

              {/* Features Section - Only show when not connected */}
              <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="gradient-card p-6 border-border/50 shadow-card rounded-xl">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    24-Hour Cooldown
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Fair distribution with 24-hour cooldown between claims. Each
                    network maintains its own cooldown period.
                  </p>
                </div>

                <div className="gradient-card p-6 border-border/50 shadow-card rounded-xl">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Multi-Network Support
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Support for Sepolia, Arbitrum Sepolia, and Optimism Sepolia.
                    Switch networks seamlessly to claim on different testnets.
                  </p>
                </div>

                <div className="gradient-card p-6 border-border/50 shadow-card rounded-xl">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Easy to Use</h3>
                  <p className="text-muted-foreground text-sm">
                    Simple one-click claiming process. Connect your wallet,
                    switch to a supported testnet, and claim your tokens
                    instantly.
                  </p>
                </div>
              </div>

              <div className="text-center py-16">
                <div className="max-w-md mx-auto space-y-6">
                  <div className="relative flex items-center justify-center mx-auto mb-4">
                    <span className="absolute inline-flex h-24 w-24 rounded-full bg-gradient-to-tr from-[#0847f7] via-[#7f5af0] to-[#00c6fb] animate-spin-slow opacity-30 blur-sm"></span>
                    <span className="absolute inline-flex h-20 w-20 rounded-full bg-gradient-to-tr from-[#0847f7] via-[#7f5af0] to-[#00c6fb] opacity-60"></span>
                    <span className="relative flex items-center justify-center h-16 w-16 rounded-full bg-background shadow-lg">
                      <Droplets className="w-10 h-10 text-[#0847f7]" />
                    </span>
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground">
                    Connect Your Wallet
                  </h3>
                  <p className="text-muted-foreground">
                    Please connect your wallet to start claiming testnet tokens
                    and access the faucet across multiple networks.
                  </p>
                  <div className="pt-4 flex justify-center">
                    <ConnectButton />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Connected User Content */}
              <div className="text-center py-8">
                <h2 className="text-5xl font-bold mb-4 text-[#0847f7]">
                  Welcome to Multi-Network Faucet!
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Ready to claim testnet tokens across multiple networks?
                </p>
              </div>

              {/* Main Functionality */}
              <div className="max-w-4xl mx-auto">
                <TestnetFaucet />
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              Have extra testnet ETH? Help keep this faucet running by donating
              to:
            </p>
            <code className="text-xs bg-muted px-3 py-1 rounded-md text-primary font-mono">
              0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
            </code>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
