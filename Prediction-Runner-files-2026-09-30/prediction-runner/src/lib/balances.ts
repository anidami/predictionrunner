import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { type Connection, type PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { USDC_MINT } from "./constants";

export async function getBalances(connection: Connection, owner: PublicKey) {
  const ata = getAssociatedTokenAddressSync(USDC_MINT, owner);
  const { value: [sol, token] } = await connection.getMultipleParsedAccounts([owner, ata], { commitment: "confirmed" });
  const amount = token && "parsed" in token.data ? Number(token.data.parsed.info.tokenAmount.uiAmountString) : 0;
  return { sol: (sol?.lamports ?? 0) / LAMPORTS_PER_SOL, usdc: amount };
}
