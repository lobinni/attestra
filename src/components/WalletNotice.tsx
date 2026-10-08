"use client";

import { useWallet } from "@/components/WalletProvider";

/**
 * The one banner that explains why an action is unavailable, instead of
 * letting a button fail silently.
 */
export function WalletNotice() {
  const { address, connect, connecting, hasWallet, network, onRightNetwork, switchNetwork, error } =
    useWallet();

  if (error) {
    return <p className="notice danger">{error}</p>;
  }

  if (!hasWallet) {
    return (
      <p className="notice warn">
        MetaMask was not detected. Install MetaMask, then reload this page to
        participate on StudioNet chain 61999.
      </p>
    );
  }

  if (!address) {
    return (
      <div className="notice">
        <p style={{ margin: "0 0 12px" }}>
          Connect MetaMask to {network.chainName} (chain {network.chainId}) to act
          on a mandate. Reading the live record needs no wallet.
        </p>
        <button className="t-btn small accent" type="button" onClick={() => void connect()} disabled={connecting}>
          {connecting ? "Connecting" : "Connect wallet"}
        </button>
      </div>
    );
  }

  if (!onRightNetwork) {
    return (
      <div className="notice warn">
        <p style={{ margin: "0 0 12px" }}>
          Your wallet is on another network. Switch to {network?.chainName} to continue.
        </p>
        <button className="t-btn small" type="button" onClick={() => void switchNetwork()}>
          Switch network
        </button>
      </div>
    );
  }

  return null;
}
