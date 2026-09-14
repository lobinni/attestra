"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Eip1193Provider } from "@/lib/attestra";
import {
  ADD_CHAIN_PARAMS,
  CHAIN_HEX,
  CHAIN_ID,
  CHAIN_NAME,
  CHAIN_RPC,
  CONTRACT_ADDRESS,
} from "@/lib/config";

export interface NetworkInfo {
  contractAddress: string;
  chainId: number;
  chainIdHex: string;
  chainName: string;
  rpcUrl: string;
  currencySymbol: string;
  currencyName: string;
  currencyDecimals: number;
  configured: boolean;
  source: string;
}

interface BrowserProvider extends Eip1193Provider {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
}

interface WalletState {
  address: string | null;
  chainId: number | null;
  connecting: boolean;
  hasWallet: boolean;
  provider: BrowserProvider | null;
  network: NetworkInfo;
  onRightNetwork: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
}

const NETWORK: NetworkInfo = {
  contractAddress: CONTRACT_ADDRESS,
  chainId: CHAIN_ID,
  chainIdHex: CHAIN_HEX,
  chainName: CHAIN_NAME,
  rpcUrl: CHAIN_RPC,
  currencySymbol: "GEN",
  currencyName: "GEN",
  currencyDecimals: 18,
  configured: /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS),
  source: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ? "environment" : "deployment",
};

const WalletContext = createContext<WalletState | null>(null);

function injectedProvider(): BrowserProvider | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { ethereum?: BrowserProvider }).ethereum ?? null
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const wallet = injectedProvider();
    setProvider(wallet);
    setHasWallet(Boolean(wallet));
    if (!wallet) return;

    const readState = async () => {
      try {
        const accounts = (await wallet.request({ method: "eth_accounts" })) as string[];
        setAddress(accounts?.[0]?.toLowerCase() ?? null);
        const hex = (await wallet.request({ method: "eth_chainId" })) as string;
        setChainId(Number.parseInt(hex, 16));
      } catch {
        setError("The wallet state could not be read.");
      }
    };
    void readState();

    const onAccounts = (...args: unknown[]) => {
      const accounts = (args[0] as string[]) ?? [];
      setAddress(accounts[0]?.toLowerCase() ?? null);
    };
    const onChain = (...args: unknown[]) => {
      setChainId(Number.parseInt(String(args[0]), 16));
    };

    wallet.on?.("accountsChanged", onAccounts);
    wallet.on?.("chainChanged", onChain);
    return () => {
      wallet.removeListener?.("accountsChanged", onAccounts);
      wallet.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const switchNetwork = useCallback(async () => {
    const wallet = injectedProvider();
    if (!wallet) {
      setError("MetaMask was not found.");
      return;
    }
    setError(null);
    try {
      await wallet.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_HEX }],
      });
    } catch (switchError) {
      const code = (switchError as { code?: number })?.code;
      if (code === 4902 || code === -32603) {
        await wallet.request({
          method: "wallet_addEthereumChain",
          params: [ADD_CHAIN_PARAMS],
        });
      } else {
        throw switchError;
      }
    }
    const hex = (await wallet.request({ method: "eth_chainId" })) as string;
    setChainId(Number.parseInt(hex, 16));
  }, []);

  const connect = useCallback(async () => {
    const wallet = injectedProvider();
    if (!wallet) {
      setError("MetaMask was not found. Install it, then reload this page.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = (await wallet.request({
        method: "eth_requestAccounts",
      })) as string[];
      setProvider(wallet);
      setAddress(accounts?.[0]?.toLowerCase() ?? null);
      await switchNetwork();
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "The wallet refused the connection.",
      );
    } finally {
      setConnecting(false);
    }
  }, [switchNetwork]);

  const disconnect = useCallback(async () => {
    const wallet = injectedProvider();
    setError(null);
    try {
      await wallet?.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // Some injected wallets do not implement permission revocation. The
      // application still clears its local session and can reconnect normally.
    } finally {
      setAddress(null);
      setChainId(null);
    }
  }, []);

  const value = useMemo<WalletState>(
    () => ({
      address,
      chainId,
      connecting,
      hasWallet,
      provider,
      network: NETWORK,
      onRightNetwork: chainId === CHAIN_ID,
      error,
      connect,
      disconnect,
      switchNetwork,
    }),
    [
      address,
      chainId,
      connecting,
      hasWallet,
      provider,
      error,
      connect,
      disconnect,
      switchNetwork,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside WalletProvider");
  return context;
}
