"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useWallet } from "@/components/WalletProvider";
import { visibleNavigation } from "@/lib/features";

const LINKS = visibleNavigation();

function abbreviatedAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function SiteHeader() {
  const pathname = usePathname();
  const {
    address,
    connect,
    connecting,
    disconnect,
    network,
    onRightNetwork,
    switchNetwork,
  } = useWallet();

  return (
    <header className="t-header">
      <div className="t-shell">
        <nav className="t-nav" aria-label="Primary">
          <Link className="t-brand" href="/">
            <span className="t-mark">A</span>
            <strong>Attestra</strong>
            <span>Verified work</span>
          </Link>

          <div className="t-nav-links">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(link.href))
                    ? "active"
                    : ""
                }
              >
                {link.label}
              </Link>
            ))}
          </div>

          {address ? (
            onRightNetwork ? (
              <div className="t-wallet-session">
                <span className="t-account" title={address}>
                  <i className="t-dot" />
                  <span>
                    <strong>{abbreviatedAddress(address)}</strong>
                    <small>MetaMask · {network.chainName}</small>
                  </span>
                </span>
                <button
                  className="t-disconnect"
                  type="button"
                  onClick={() => void disconnect()}
                  aria-label="Disconnect MetaMask wallet"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="t-wallet-session">
                <button
                  className="t-account"
                  type="button"
                  onClick={() => void switchNetwork()}
                  title={address}
                >
                  <i className="t-dot warn" />
                  <span>
                    <strong>{abbreviatedAddress(address)}</strong>
                    <small>Switch to {network.chainName}</small>
                  </span>
                </button>
                <button
                  className="t-disconnect"
                  type="button"
                  onClick={() => void disconnect()}
                  aria-label="Disconnect MetaMask wallet"
                >
                  Disconnect
                </button>
              </div>
            )
          ) : (
            <button
              className="t-account"
              type="button"
              onClick={() => void connect()}
              disabled={connecting}
            >
              <i className="t-dot warn" />
              <span>
                <strong>{connecting ? "Connecting" : "Connect wallet"}</strong>
                <small>{network?.chainName ?? "Studio network"}</small>
              </span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
