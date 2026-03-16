"use client";

import React, { useState, useEffect } from "react";
import { Download, Smartphone, Apple, Android } from "lucide-react";

type DeviceType = "android" | "ios" | "other";

export default function DownloadAppButton() {
  const [deviceType, setDeviceType] = useState<DeviceType>("other");
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("android")) {
      setDeviceType("android");
    } else if (userAgent.includes("iphone") || userAgent.includes("ipad") || userAgent.includes("ipod")) {
      setDeviceType("ios");
    } else {
      setDeviceType("other");
    }
  }, []);

  const handleDownload = () => {
    // In a real app, these would be actual download URLs
    if (deviceType === "android") {
      // APK download URL
      window.open("https://github.com/kawasdal4/lap_wa/releases", "_blank");
    } else if (deviceType === "ios") {
      // App Store URL
      window.open("https://github.com/kawasdal4/lap_wa/releases", "_blank");
    } else {
      // Desktop - show options
      window.open("https://github.com/kawasdal4/lap_wa/releases", "_blank");
    }
  };

  const getDeviceIcon = () => {
    if (deviceType === "ios") return <Apple className="w-5 h-5" />;
    if (deviceType === "android") return <Android className="w-5 h-5" />;
    return <Smartphone className="w-5 h-5" />;
  };

  const getDownloadText = () => {
    if (deviceType === "ios") return "Download iOS";
    if (deviceType === "android") return "Download APK";
    return "Get App";
  };

  return (
    <>
      {/* Main Download Button - Outside app frame (desktop only) */}
      <div 
        className="fixed bottom-6 right-6 z-[100] hidden xl:flex"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Glow Effect Container */}
        <div className="relative">
          {/* Animated Glow Rings */}
          <div className="absolute inset-0 scale-150">
            {/* Outer pulse ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 opacity-0 animate-glow-pulse-1 blur-xl" />
            {/* Middle pulse ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 opacity-0 animate-glow-pulse-2 blur-lg" />
            {/* Inner pulse ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 opacity-0 animate-glow-pulse-3 blur-md" />
          </div>

          {/* Floating Particles */}
          <div className="absolute -inset-8 overflow-visible pointer-events-none">
            <div className="absolute top-0 left-1/2 w-2 h-2 bg-cyan-400 rounded-full animate-float-particle-1 opacity-60" />
            <div className="absolute top-1/4 right-0 w-1.5 h-1.5 bg-blue-400 rounded-full animate-float-particle-2 opacity-50" />
            <div className="absolute bottom-1/4 left-0 w-1 h-1 bg-cyan-300 rounded-full animate-float-particle-3 opacity-70" />
            <div className="absolute bottom-0 right-1/4 w-1.5 h-1.5 bg-blue-300 rounded-full animate-float-particle-4 opacity-40" />
          </div>

          {/* Button */}
          <button
            onClick={handleDownload}
            className="relative group flex items-center gap-3 px-6 py-4 rounded-2xl font-semibold text-white transition-all duration-300 transform hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #1e40af 0%, #0891b2 50%, #1e40af 100%)",
              backgroundSize: "200% 200%",
              animation: "gradientShift 3s ease infinite",
              boxShadow: `
                0 0 20px rgba(59, 130, 246, 0.5),
                0 0 40px rgba(59, 130, 246, 0.3),
                0 0 60px rgba(59, 130, 246, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.2),
                inset 0 -1px 0 rgba(0, 0, 0, 0.2)
              `,
            }}
          >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>

            {/* Icon Container */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent" />
              <Download className="w-5 h-5 relative z-10 group-hover:animate-bounce" />
            </div>

            {/* Text */}
            <div className="relative flex flex-col items-start">
              <span className="text-sm font-bold tracking-wide uppercase">
                {getDownloadText()}
              </span>
              <span className="text-[10px] text-cyan-200 opacity-80">
                Available Now
              </span>
            </div>

            {/* Device Icon */}
            <div className="relative ml-1">
              {getDeviceIcon()}
            </div>

            {/* Corner Accents */}
            <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-cyan-300/50 rounded-tr-lg" />
            <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-cyan-300/50 rounded-bl-lg" />
          </button>

          {/* Tooltip */}
          <div 
            className={`absolute bottom-full mb-4 left-1/2 -translate-x-1/2 whitespace-nowrap transition-all duration-300 ${
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            <div className="relative px-4 py-2 rounded-xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-sm shadow-2xl">
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                <div className="w-3 h-3 rotate-45 bg-slate-900 border-r border-b border-cyan-500/30" />
              </div>
              <p className="text-sm text-white font-medium">
                Install for better experience!
              </p>
              <p className="text-xs text-cyan-300/70 mt-0.5">
                Native app with offline support
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style jsx global>{`
        @keyframes glow-pulse-1 {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        @keyframes glow-pulse-2 {
          0%, 100% { opacity: 0.2; transform: scale(1.1); }
          50% { opacity: 0.5; transform: scale(1); }
        }
        @keyframes glow-pulse-3 {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        .animate-glow-pulse-1 {
          animation: glow-pulse-1 2s ease-in-out infinite;
        }
        .animate-glow-pulse-2 {
          animation: glow-pulse-2 2s ease-in-out infinite 0.3s;
        }
        .animate-glow-pulse-3 {
          animation: glow-pulse-3 2s ease-in-out infinite 0.6s;
        }

        @keyframes float-particle-1 {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.6; }
          50% { transform: translateY(-20px) translateX(5px); opacity: 1; }
        }
        @keyframes float-particle-2 {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.5; }
          50% { transform: translateY(-15px) translateX(-10px); opacity: 0.8; }
        }
        @keyframes float-particle-3 {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.7; }
          50% { transform: translateY(-25px) translateX(-5px); opacity: 1; }
        }
        @keyframes float-particle-4 {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.4; }
          50% { transform: translateY(-18px) translateX(8px); opacity: 0.7; }
        }
        .animate-float-particle-1 { animation: float-particle-1 3s ease-in-out infinite; }
        .animate-float-particle-2 { animation: float-particle-2 2.5s ease-in-out infinite 0.5s; }
        .animate-float-particle-3 { animation: float-particle-3 3.5s ease-in-out infinite 1s; }
        .animate-float-particle-4 { animation: float-particle-4 2.8s ease-in-out infinite 0.8s; }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </>
  );
}
