"use client"

import React, { useEffect, useState, useCallback } from "react";
import AppSplash from "./AppSplash";
import CopyrightModal from "./CopyrightModal";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Register Service Worker for PWA
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("[PWA] Service Worker registered", reg.scope))
        .catch((err) => console.log("[PWA] Service Worker failed", err));
    }

    // Simulate app initialization (fonts, assets, etc.)
    const initTimer = setTimeout(() => {
      setIsReady(true);
      // Stagger content fade-in
      setTimeout(() => setShowContent(true), 100);
    }, 1200);

    return () => clearTimeout(initTimer);
  }, []);

  // Prevent context menu on long press (for native app feel)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div 
      className="app-frame"
      onContextMenu={handleContextMenu}
    >
      {/* Splash Screen */}
      {!isReady && <AppSplash />}
      
      {/* Main Content with Fade-in */}
      <div 
        className={`flex-1 flex flex-col transition-opacity duration-300 ${
          showContent ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {children}
      </div>
      
      {/* Floating Copyright Button - Bottom Center */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+12px)] left-0 right-0 z-[60] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10 shadow-lg">
          <CopyrightModal>
            <button 
              className="group relative cursor-pointer text-[10px] text-white/70 hover:text-white transition-all duration-200 uppercase tracking-[0.15em] flex items-center gap-1.5 focus:outline-none active:scale-95"
              aria-label="Copyright information"
            >
              <span className="w-1.5 h-1.5 bg-orange-500/60 rounded-full group-hover:bg-orange-500 group-hover:animate-pulse transition-colors" />
              <span className="font-medium">© FOE - 2026</span>
            </button>
          </CopyrightModal>
        </div>
      </div>
    </div>
  );
}
