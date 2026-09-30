"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PhantomButton } from "./PhantomButton";
import { PublicKey } from "@solana/web3.js";
import { SolanaProvider } from "@/providers/solana-provider";
import { getClient, useClient } from "@/lib/pm-amm-client";
import { loadMarkets, playable, type GameMarket, type Pick } from "@/lib/markets";
import { minOutput, quoteSwap } from "@/lib/pm-amm-helpers";
import { getBalances } from "@/lib/balances";
import { AMOUNT_IN, FAUCET_URL, OWNER_ADDRESS, solscanAccountUrl, solscanTxUrl } from "@/lib/constants";
import { mockMarkets } from "@/data/mockMarkets";

type Side = "yes" | "no";
type Screen = "start" | "game" | "result";
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;
const percent = (p: number) => `${Math.round(p * 100)}%`;
const readableError = (e: unknown) => {
  const text = e instanceof Error ? e.message : String(e);
  if (/reject|cancel/i.test(text)) return "Approval cancelled. Your prediction is saved; no purchase was made.";
  if (/429|rate limit/i.test(text)) return "Solana Devnet is busy. Wait 20 seconds, then try again.";
  if (/6007|slippage/i.test(text)) return "The price changed before confirmation. Refresh the quote and try again.";
  if (/insufficient|debit/i.test(text)) return "This wallet needs test SOL for fees and 1 mUSDC for the purchase.";
  if (/expired|block height|timed out|timeout/i.test(text)) return "Confirmation was delayed. Check your wallet activity before sending another purchase.";
  return text.length > 220 ? `${text.slice(0, 220)}…` : text;
};

export default function Runner() { return <SolanaProvider><RunnerApp /></SolanaProvider>; }

function RunnerApp() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const client = useClient();
  const readClient = useMemo(() => getClient(connection), [connection]);
  const [screen, setScreen] = useState<Screen>("start");
  const [markets, setMarkets] = useState<GameMarket[]>(mockMarkets);
  const [runMarkets, setRunMarkets] = useState<GameMarket[]>(mockMarkets);
  const [marketStatus, setMarketStatus] = useState("Loading devnet markets…");
  const [marketLoading, setMarketLoading] = useState(true);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [lane, setLane] = useState<Side | null>(null);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<Pick | null>(null);
  const [balances, setBalances] = useState<{ sol: number; usdc: number } | null>(null);
  const [balanceError, setBalanceError] = useState("");
  const [txState, setTxState] = useState<"idle" | "quoting" | "ready" | "sending" | "success" | "error">("idle");
  const [txError, setTxError] = useState("");
  const [signature, setSignature] = useState("");
  const [selectedPick, setSelectedPick] = useState(0);
  const [quotedTokens, setQuotedTokens] = useState<number | null>(null);
  const [faucetBusy, setFaucetBusy] = useState(false);
  const [faucetMessage, setFaucetMessage] = useState("");
  const lock = useRef(false);
  const pendingTrade = useRef(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const market = runMarkets[picks.length] ?? runMarkets[0];
  const contrarians = picks.filter((p) => p.probability < 0.5).length;
  const chosen = picks[selectedPick];
  const busy = txState === "sending" || txState === "quoting";

  const refreshMarkets = useCallback(async () => {
    setMarketLoading(true);
    try {
      const live = await loadMarkets(readClient);
      if (live.length >= 3) { setMarkets(live); setMarketStatus("3 live devnet markets"); }
      else { setMarkets(mockMarkets); setMarketStatus("Sample questions · no active set of 3 markets"); }
    } catch (e) { setMarkets(mockMarkets); setMarketStatus(`Sample questions · ${readableError(e)}`); }
    finally { setMarketLoading(false); }
  }, [readClient]);

  const refreshBalances = useCallback(async () => {
    if (!wallet.publicKey) { setBalances(null); setBalanceError(""); return; }
    try { setBalances(await getBalances(connection, wallet.publicKey)); setBalanceError(""); }
    catch (e) { setBalanceError(readableError(e)); }
  }, [connection, wallet.publicKey]);

  useEffect(() => { void refreshMarkets(); }, [refreshMarkets]);
  useEffect(() => {
    void refreshBalances();
    const timer = setInterval(() => { if (!document.hidden) void refreshBalances(); }, 20_000);
    return () => clearInterval(timer);
  }, [refreshBalances]);
  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }, []);

  const enterGate = useCallback((side: Side) => {
    if (screen !== "game" || lock.current || feedback) return;
    lock.current = true;
    const pick: Pick = { market, side, probability: side === "yes" ? market.yesProbability : 1 - market.yesProbability };
    const next = [...picks, pick];
    setLane(side); setProgress(100); setFeedback(pick);
    feedbackTimer.current = setTimeout(() => {
      setPicks(next); setFeedback(null); setLane(null); setProgress(0); lock.current = false;
      if (next.length === 3) setScreen("result");
    }, 1100);
  }, [screen, feedback, market, picks]);

  useEffect(() => {
    if (screen !== "game" || feedback) return;
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      if (!document.hidden) setProgress((p) => Math.min(100, p + (now - previous) / 60));
      previous = now;
    }, 50);
    return () => clearInterval(timer);
  }, [screen, feedback, picks.length]);
  useEffect(() => { if (progress >= 100 && lane && !feedback) enterGate(lane); }, [progress, lane, feedback, enterGate]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (screen !== "game" || feedback || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); setLane("yes"); }
      if (event.key === "ArrowRight") { event.preventDefault(); setLane("no"); }
      if (event.key === "Enter" && lane) { event.preventDefault(); enterGate(lane); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [screen, lane, feedback, enterGate]);

  function start() {
    setRunMarkets(markets);
    setPicks([]); setLane(null); setProgress(0); setFeedback(null); setSelectedPick(0);
    setSignature(""); setTxError(""); setTxState("idle"); setQuotedTokens(null); lock.current = false;
    setScreen("game");
  }

  async function previewPurchase() {
    if (!chosen?.market.address) return;
    setTxState("quoting"); setTxError("");
    try {
      const account = await readClient.fetchMarket(new PublicKey(chosen.market.address));
      if (!account || !playable(account)) throw new Error("This market has ended. Start a new run with refreshed markets.");
      const quote = quoteSwap(account, chosen.side === "yes" ? "usdcToYes" : "usdcToNo", AMOUNT_IN);
      if (minOutput(quote) <= 0) throw new Error("This market has too little liquidity for a purchase.");
      setQuotedTokens(quote.out / 1e6); setTxState("ready");
    } catch (e) { setTxError(readableError(e)); setTxState("error"); }
  }

  async function buyPrediction() {
    if (pendingTrade.current || !client || !wallet.publicKey || !chosen?.market.address) return;
    pendingTrade.current = true; setTxState("sending"); setTxError("");
    try {
      const funds = await getBalances(connection, wallet.publicKey);
      setBalances(funds);
      if (funds.usdc < 1 || funds.sol < 0.003) throw new Error("This wallet needs test SOL for fees and 1 mUSDC for the purchase.");
      const address = new PublicKey(chosen.market.address);
      const fresh = await client.fetchMarket(address);
      if (!fresh || !playable(fresh)) throw new Error("This market has ended. Start a new run with refreshed markets.");
      const direction = chosen.side === "yes" ? "usdcToYes" : "usdcToNo";
      const quote = quoteSwap(fresh, direction, AMOUNT_IN);
      const minimum = minOutput(quote);
      if (minimum <= 0) throw new Error("This market has too little liquidity for a purchase.");
      const sig = await client.send.swap(address, direction, AMOUNT_IN, minimum);
      setSignature(sig); setTxState("success"); void refreshBalances();
    } catch (e) { setTxError(readableError(e)); setTxState("error"); }
    finally { pendingTrade.current = false; }
  }

  async function faucet() {
    if (!wallet.publicKey || faucetBusy) return;
    setFaucetBusy(true); setFaucetMessage("");
    try {
      const response = await fetch(FAUCET_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet: wallet.publicKey.toBase58() }) });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? `Faucet returned ${response.status}`);
      setFaucetMessage("1,000 test mUSDC received. Balance will refresh shortly.");
      await connection.confirmTransaction(body.signature, "confirmed"); void refreshBalances();
    } catch (e) { setFaucetMessage(readableError(e)); }
    finally { setFaucetBusy(false); }
  }

  const selectTrade = (index: number) => { if (busy || signature) return; setSelectedPick(index); setTxState("idle"); setQuotedTokens(null); setTxError(""); };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Prediction Runner home"><span className="brand-symbol">Ⅱ</span><span>prediction<span className="brand-light">runner</span></span></a>
        <div className="header-right"><span className="network-pill"><span />SOLANA DEVNET</span><PhantomButton /></div>
      </header>
      <div className="workspace">
        <section className="game-column" aria-label="Prediction Runner game">
          <div className="section-label"><span className="label-line" />THE PREDICTION PLAYGROUND<span className="session-tag">RUN 001</span></div>
          <div className={`game-board ${screen} ${feedback ? "feedback-active" : ""}`}>
            <div className="board-hud"><span>{screen === "start" ? "READY WHEN YOU ARE" : screen === "result" ? "FINISH LINE" : `QUESTION ${picks.length + 1} / 3`}</span><span>{screen === "result" ? "03 / 03" : `${String(picks.length).padStart(2, "0")} / 03`}<span className="hud-dot" /></span></div>
            <div className="road"><div className="road-grid" /><div className="lane-line left" /><div className="lane-line right" /><div className="center-line" /></div>
            {screen === "start" && <div className="start-overlay">
              <span className="eyebrow">THREE QUESTIONS. TWO LANES.</span><h1>Make your<br /><em>move.</em></h1>
              <p>Run into YES or NO.<br />Turn one pick into a Solana prediction.</p>
              <div className="preview-gates"><span className="yes">YES</span><span className="no">NO</span></div>
              <div className="start-runner" aria-hidden="true">🏃</div>
              <button className="primary start-button" onClick={start}>Start run <span>↵</span></button>
              <span className="start-note">Play first. Connect when you’re ready.</span>
            </div>}
            {screen === "game" && <>
              <div className="question-card"><span className={`data-tag ${market.source}`}>{market.source === "live" ? "ON-CHAIN MARKET" : "SAMPLE QUESTION"}</span><h1>{market.question}</h1><div className="probability"><span className="yes">YES {percent(market.yesProbability)}</span><span className="no">NO {percent(1 - market.yesProbability)}</span></div><div className="probability-bar"><span style={{ width: percent(market.yesProbability) }} /></div></div>
              <div className="gates" style={{ top: `${42 + progress * 0.34}%`, transform: `translateX(-50%) scale(${0.62 + progress * 0.0062})` }} aria-hidden="true"><div className={`gate yes ${lane === "yes" ? "chosen" : ""}`}><strong>YES</strong><span>{percent(market.yesProbability)}</span></div><div className={`gate no ${lane === "no" ? "chosen" : ""}`}><strong>NO</strong><span>{percent(1 - market.yesProbability)}</span></div></div>
              <div className={`runner ${lane ?? "center"}`} aria-hidden="true"><span>🏃</span><div className="runner-shadow" /></div>
              {feedback && <div className="pick-feedback" role="status"><span className={`feedback-icon ${feedback.side}`}>✓</span><h2>{feedback.side.toUpperCase()} selected</h2><p>{percent(feedback.probability)} implied probability</p>{feedback.probability < 0.5 && <span className="contrarian-pill">✦ Contrarian pick</span>}</div>}
              <div className="track-progress"><span style={{ width: `${progress}%` }} /></div>
            </>}
            {screen === "result" && <div className="result-overlay"><span className="finish-symbol">✓</span><span className="eyebrow">RUN COMPLETE</span><h1>Good run.<br /><em>Bold picks.</em></h1><div className="result-stats"><div><strong>03</strong><span>predictions made</span></div><div><strong>{String(contrarians).padStart(2, "0")}</strong><span>contrarian {contrarians === 1 ? "pick" : "picks"}</span></div></div><div className="pick-summary">{picks.map((p, i) => <div key={i}><span>0{i + 1}</span><p>{p.market.question}</p><b className={p.side}>{p.side.toUpperCase()}</b></div>)}</div><button className="secondary" disabled={busy} onClick={() => { if (markets.every((m) => m.source === "sample")) void refreshMarkets(); start(); }}>Play again</button><span className="start-note">{wallet.publicKey ? `Wallet connected: ${short(wallet.publicKey.toBase58())}` : "Wallet not connected"}</span></div>}
          </div>
          <div className="game-controls"><button className={`lane-button yes ${lane === "yes" ? "active" : ""}`} disabled={screen !== "game" || !!feedback} onClick={() => setLane("yes")}><kbd>←</kbd><span>YES lane</span></button><button className="enter-button" disabled={screen !== "game" || !lane || !!feedback} onClick={() => lane && enterGate(lane)}>Enter gate <kbd>↵</kbd></button><button className={`lane-button no ${lane === "no" ? "active" : ""}`} disabled={screen !== "game" || !!feedback} onClick={() => setLane("no")}><span>NO lane</span><kbd>→</kbd></button></div>
        </section>
        <aside className="sidebar">
          <div className="sidebar-title"><span className="eyebrow">YOUR SESSION</span><h2>Small moves.<br />Real predictions.</h2></div>
          <section className="panel wallet-panel"><div className="panel-heading"><h3>Wallet</h3><span className="tiny-pill">DEVNET</span></div><p className="wallet-address">{wallet.publicKey ? short(wallet.publicKey.toBase58()) : "Connect to make it on-chain"}</p>{wallet.connected ? <><div className="balance-row"><span>Test balance</span><strong>{balances ? `${balances.usdc.toLocaleString(undefined, { maximumFractionDigits: 2 })} mUSDC` : "Loading…"}</strong></div><div className="balance-row"><span>For network fees</span><strong>{balances ? `${balances.sol.toFixed(3)} SOL` : "—"}</strong></div><button className="text-button" onClick={faucet} disabled={faucetBusy}>{faucetBusy ? "Claiming…" : "Get test mUSDC"}</button>{balanceError && <p className="error-text" role="status">{balanceError}</p>}{faucetMessage && <p className="small-note" role="status">{faucetMessage}</p>}</> : <><PhantomButton /><p className="small-note">In Phantom, enable Testnet mode and select Solana Devnet.</p><a className="prepared-wallet" href={solscanAccountUrl(OWNER_ADDRESS)} target="_blank" rel="noreferrer">Prepared wallet: {short(OWNER_ADDRESS)}</a></>}</section>
          {screen !== "result" ? <section className="panel how-to"><h3>The rules are simple.</h3><ol><li><span>01</span><div><strong>Read the question</strong><p>Odds show what the market thinks.</p></div></li><li><span>02</span><div><strong>Pick your lane</strong><p>Left for YES. Right for NO.</p></div></li><li><span>03</span><div><strong>Make one pick real</strong><p>After your run, buy one outcome with 1 test mUSDC.</p></div></li></ol><div className="contrarian-note"><span>✦</span><p>Pick the side below 50%?<br /><strong>That’s a contrarian pick.</strong></p></div></section> : <section className="panel trade-panel"><div className="panel-heading"><h3>Make a pick on-chain</h3><span className="tiny-pill">1 mUSDC</span></div><p className="small-note">Choose one prediction to buy. Your other two choices stay in this run.</p><div className="trade-options">{picks.map((p, i) => <button key={i} className={selectedPick === i ? "selected" : ""} onClick={() => selectTrade(i)} disabled={busy || !!signature || !p.market.address}><span>0{i + 1}</span><p>{p.market.question}</p><b className={p.side}>{p.side.toUpperCase()}</b></button>)}</div>{signature ? <div className="transaction-success" role="status"><strong>✓ Prediction confirmed on Solana</strong><p>One {chosen.side.toUpperCase()} purchase · 1 mUSDC</p><a href={solscanTxUrl(signature)} target="_blank" rel="noreferrer">View transaction</a><code>{short(signature)}</code></div> : <>{!chosen?.market.address ? <p className="small-note">This run used sample questions. Refresh live markets and play again to trade.</p> : <>{quotedTokens !== null && <p className="quote-line">Estimated {quotedTokens.toFixed(3)} {chosen.side.toUpperCase()} tokens <span>2% fee · 1% slippage</span></p>}{txState === "ready" ? wallet.connected ? <button className="primary" onClick={buyPrediction}>Approve in Phantom · 1 mUSDC</button> : <PhantomButton /> : <button className="primary" onClick={previewPurchase} disabled={busy}>{txState === "sending" ? "Waiting for Phantom / confirmation…" : txState === "quoting" ? "Getting current quote…" : "Preview purchase · 1 mUSDC"}</button>}<p className="small-note">Test assets only. Purchases mint outcome tokens; market resolution is manual.</p></>}{txError && <p className="error-text" role="alert">{txError}</p>}</>}</section>}
          <div className="market-status"><span className={markets.every((m) => m.source === "live") ? "live-dot" : "sample-dot"} /><p>{marketStatus}</p><button disabled={marketLoading || screen === "game" || busy} onClick={refreshMarkets} aria-label="Refresh live markets">↻</button></div>
          <p className="built-with">Built on <strong>Solana</strong> & <a href="https://predict-pm-amm.dev/hackathon.md" target="_blank" rel="noreferrer">pm-AMM</a><span>Test markets. Test assets. Real transactions.</span></p>
        </aside>
      </div>
      <footer><span>PLAY THE ODDS. PICK YOUR SIDE.</span><span>NO REAL MONEY · SOLANA DEVNET</span></footer>
    </main>
  );
}
