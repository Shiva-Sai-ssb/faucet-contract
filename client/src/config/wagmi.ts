import "@rainbow-me/rainbowkit/styles.css";
import { http } from "wagmi";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, arbitrumSepolia, optimismSepolia } from "wagmi/chains";

const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const SEPOLIA_RPC_URL = import.meta.env.VITE_SEPOLIA_RPC_URL;
const ARBITRUM_SEPOLIA_RPC_URL = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;
const OPTIMISM_SEPOLIA_RPC_URL = import.meta.env.VITE_OPTIMISM_SEPOLIA_RPC_URL;

export const wagmiConfig = getDefaultConfig({
  appName: "faucet-contract",
  projectId: PROJECT_ID,
  chains: [sepolia, arbitrumSepolia, optimismSepolia],
  transports: {
    [sepolia.id]: http(SEPOLIA_RPC_URL),
    [arbitrumSepolia.id]: http(ARBITRUM_SEPOLIA_RPC_URL),
    [optimismSepolia.id]: http(OPTIMISM_SEPOLIA_RPC_URL),
  },
});
