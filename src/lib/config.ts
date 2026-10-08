"use client";

import { studionet } from "genlayer-js/chains";
import deployment from "../../deployments/studionet.json";

/**
 * The SDK chain object is the network authority. The application never defines
 * a simulator chain and never falls back to one.
 */
export const CHAIN = studionet;
export const CHAIN_ID = 61999;
export const CHAIN_HEX = "0xf22f" as const;
export const CHAIN_NAME = "GenLayer StudioNet";
export const CHAIN_RPC =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";
export const EXPLORER =
  process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explorer-studio.genlayer.com";

/**
 * One replacement point for the deployed contract. Vercel can override the
 * committed deployment without a code change. There is deliberately no
 * database-backed override and no guessed address.
 */
export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || deployment.contract.address
) as `0x${string}`;

if (CHAIN.id !== CHAIN_ID) {
  throw new Error("The GenLayer SDK StudioNet chain does not match chain 61999.");
}

export const CONTRACT_EXPLORER_URL = `${EXPLORER.replace(/\/+$/, "")}/address/${CONTRACT_ADDRESS}`;

export const ADD_CHAIN_PARAMS = {
  chainId: CHAIN_HEX,
  chainName: CHAIN_NAME,
  rpcUrls: [CHAIN_RPC],
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18,
  },
  blockExplorerUrls: [EXPLORER],
};

