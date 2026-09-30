"use client";
import dynamic from "next/dynamic";
const Runner = dynamic(() => import("@/components/Runner"), { ssr: false, loading: () => <div className="loading-app">Loading Prediction Runner…</div> });
export default function Page() { return <Runner />; }
