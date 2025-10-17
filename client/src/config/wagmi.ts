import "@rainbow-me/rainbowkit/styles.css";
import { http, webSocket, fallback } from "wagmi";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, arbitrumSepolia, optimismSepolia } from "wagmi/chains";

const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const SEPOLIA_RPC_URL = import.meta.env.VITE_SEPOLIA_RPC_URL;
const ARBITRUM_SEPOLIA_RPC_URL = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;
const OPTIMISM_SEPOLIA_RPC_URL = import.meta.env.VITE_OPTIMISM_SEPOLIA_RPC_URL;

// WebSocket URLs for real-time updates
const SEPOLIA_WS_URL = import.meta.env.VITE_SEPOLIA_WS_URL;
const ARBITRUM_SEPOLIA_WS_URL = import.meta.env.VITE_ARBITRUM_SEPOLIA_WS_URL;
const OPTIMISM_SEPOLIA_WS_URL = import.meta.env.VITE_OPTIMISM_SEPOLIA_WS_URL;

export const wagmiConfig = getDefaultConfig({
  appName: "faucet-contract",
  projectId: PROJECT_ID,
  chains: [sepolia, arbitrumSepolia, optimismSepolia],
  transports: {
    [sepolia.id]: fallback([
      webSocket(SEPOLIA_WS_URL, {
        reconnect: {
          attempts: 5,
          delay: 1000,
        },
      }),
      http(SEPOLIA_RPC_URL),
    ]),
    [arbitrumSepolia.id]: fallback([
      webSocket(ARBITRUM_SEPOLIA_WS_URL, {
        reconnect: {
          attempts: 5,
          delay: 1000,
        },
      }),
      http(ARBITRUM_SEPOLIA_RPC_URL),
    ]),
    [optimismSepolia.id]: fallback([
      webSocket(OPTIMISM_SEPOLIA_WS_URL, {
        reconnect: {
          attempts: 5,
          delay: 1000,
        },
      }),
      http(OPTIMISM_SEPOLIA_RPC_URL),
    ]),
  },
});
