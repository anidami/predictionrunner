import { decodeName, type MarketAccount, type PmAmmClient } from "@pm-amm/sdk";
import { PublicKey } from "@solana/web3.js";
import { USDC_MINT } from "./constants";
import { fetchMarkets, marketState } from "./pm-amm-helpers";
import configuredMarkets from "@/data/devnetMarkets.json";

export interface GameMarket {
  address: string | null;
  question: string;
  yesProbability: number;
  source: "live" | "sample";
  authority?: string;
  endTs?: number;
}
export interface Pick { market: GameMarket; side: "yes" | "no"; probability: number }

export function playable(m: MarketAccount) {
  const state = marketState(m);
  return m.collateralMint.equals(USDC_MINT) && !state.expired && !state.resolved &&
    state.secondsLeft > 60 && state.lEff > 0 && state.x > 0 && state.y > 0;
}

function toGameMarket(address: PublicKey, account: MarketAccount): GameMarket {
  return {
    address: address.toBase58(), question: decodeName(account.name),
    yesProbability: marketState(account).price, source: "live",
    authority: account.authority.toBase58(), endTs: account.endTs.toNumber(),
  };
}

export async function loadMarkets(client: PmAmmClient): Promise<GameMarket[]> {
  const configured = configuredMarkets as { address: string }[];
  if (configured.length) {
    const pdas = configured.map((m) => new PublicKey(m.address));
    const accounts = await fetchMarkets(client, pdas);
    const live = accounts.flatMap((m, i) => m && playable(m) ? [toGameMarket(pdas[i], m)] : []);
    if (live.length >= 3) return live.slice(0, 3);
  }
  const all = await client.fetchAllMarkets(443);
  return all.filter((m) => playable(m.account)).slice(0, 3).map((m) => toGameMarket(m.publicKey, m.account));
}
