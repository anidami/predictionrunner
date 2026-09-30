import { PublicKey } from "@solana/web3.js";

// Fixed devnet configuration. No mainnet override is exposed in this prototype.
export const RPC_URL = "https://api.devnet.solana.com";
export const PROGRAM_ID = new PublicKey("GV1FMGHRYBjQLaghE5fnGuYCuCcpdt3GD5xEX3TwN16y");
export const USDC_MINT = new PublicKey("3WQ8hCqTNwjrh8WzE2XyoZoUrd1miPcwWfMkmFPUMEWZ");
export const FAUCET_URL = "https://pm-amm-devnet.vercel.app/api/faucet";
export const OWNER_ADDRESS = "HCXuCHR7ZKeGeP4bKSHyMNMS1hNqBr8K6tXnAbt84LaY";
export const AMOUNT_IN = 1_000_000; // 1 mUSDC. SDK swaps take raw six-decimal units.
export const solscanTxUrl = (signature: string) => `https://solscan.io/tx/${signature}?cluster=devnet`;
export const solscanAccountUrl = (address: string) => `https://solscan.io/account/${address}?cluster=devnet`;
