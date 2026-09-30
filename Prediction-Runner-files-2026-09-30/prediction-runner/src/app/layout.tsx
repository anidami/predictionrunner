import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prediction Runner · Solana Devnet",
  description: "Pick a lane. Make a prediction. A tiny runner built on Solana and pm-AMM.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
