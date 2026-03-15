"use client"

import React, { useEffect, useState } from "react";
import AppSplash from "./AppSplash";
import CopyrightModal from "./CopyrightModal";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("SW registered", reg))
        .catch((err) => console.log("SW failed", err));
    }

    // Simulate app initialization
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app-frame">
      {!isReady && <AppSplash />}
      {children}
      
      {/* Floating Copyright Button */}
      <div className="fixed bottom-4 left-4 z-[60] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
        <CopyrightModal>
          <button className="group relative cursor-pointer text-[10px] text-white/40 hover:text-white/80 transition-colors uppercase tracking-[0.1em] flex items-center gap-1.5 focus:outline-none">
            <span className="w-1.5 h-1.5 bg-orange-500/50 rounded-full group-hover:bg-orange-500 animate-pulse" />
            © FOE - 2026
          </button>
        </CopyrightModal>
      </div>
    </div>
  );
}
