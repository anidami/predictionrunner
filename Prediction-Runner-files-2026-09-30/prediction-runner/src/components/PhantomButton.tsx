"use client";
import { useState } from "react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function PhantomButton() {
  const { wallets, connected } = useWallet();
  const [showHelp, setShowHelp] = useState(false);
  const available = wallets.some((w) => w.adapter.name === "Phantom" && w.readyState === WalletReadyState.Installed);
  if (connected || available) return <WalletMultiButton />;
  return <div className="phantom-connect-control">
    <button className="wallet-adapter-button" onClick={() => setShowHelp((value) => !value)}>Connect Phantom</button>
    {showHelp && <p className="phantom-help" role="status">Open http://127.0.0.1:3000 in the browser where your Phantom extension is installed.</p>}
  </div>;
}
