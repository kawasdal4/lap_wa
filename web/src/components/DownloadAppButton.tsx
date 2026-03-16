"use client";

import React, { useState, useEffect } from "react";
import { Download, Apple, Smartphone, X, Share2, PlusSquare, ChevronRight } from "lucide-react";

type DeviceType = "android" | "ios" | "other";

// R2 Download Base URL
const R2_PUBLIC_DOMAIN = "https://pub-03210bb1ce9c4a419bd417ee47bd4e6d.r2.dev";

// R2 Download URLs - Direct download links as requested
const DOWNLOAD_URLS = {
  android: `${R2_PUBLIC_DOMAIN}/mobile-builds/android/app-release.apk`,
  ios: `${R2_PUBLIC_DOMAIN}/mobile-builds/ios/app-release.ipa`,
};

export default function DownloadAppButton() {
  const [deviceType, setDeviceType] = useState<DeviceType>("other");
  const [isHovered, setIsHovered] = useState(false);
  const [showMobilePopup, setShowMobilePopup] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showDesktopMessage, setShowDesktopMessage] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hide inside Native App
    const checkNative = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        console.log("Capacitor Platform:", Capacitor.getPlatform());
        if (Capacitor.isNativePlatform()) {
          setIsVisible(false);
          return;
        }
      } catch (e) {
        console.log("Capacitor not loaded yet or not available");
      }
      
      // Secondary check via window
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
        setIsVisible(false);
      }
    };

    checkNative();

    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    
    if (isAndroid) {
      setDeviceType("android");
    } else if (isIOS) {
      setDeviceType("ios");
    } else {
      setDeviceType("other");
    }
  }, []);

  const handleDownload = () => {
    if (deviceType === "ios") {
      // For iOS, show installation options (PWA or IPA)
      setShowIOSInstructions(true);
    } else if (deviceType === "android") {
      // Direct download for Android
      const link = document.createElement('a');
      link.href = DOWNLOAD_URLS.android;
      link.download = 'app-release.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowMobilePopup(false);
    } else {
      // For Desktop/Other, show message suggesting mobile installation
      setShowDesktopMessage(true);
      setShowMobilePopup(true);
    }
  };

  const handleIOSIPAInstall = () => {
    // Download IPA for sideloading
    const link = document.createElement('a');
    link.href = DOWNLOAD_URLS.ios;
    link.download = 'app-release.ipa';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowIOSInstructions(false);
    setShowMobilePopup(false);
  };

  const getDeviceIcon = (size: string = "w-5 h-5") => {
    if (deviceType === "ios") return <Apple className={`${size} xl:w-4 xl:h-4`} />;
    if (deviceType === "android") return <Smartphone className={`${size} xl:w-4 xl:h-4`} />;
    return <Smartphone className={`${size} xl:w-4 xl:h-4`} />;
  };

  const getDownloadText = () => {
    if (deviceType === "ios") return "Install di iOS";
    if (deviceType === "android") return "Download APK";
    return "Download App";
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Mobile FAB Button - Visible on all screens < xl */}
      <div className="fixed bottom-20 right-3 z-[100] xl:hidden">
        {/* Glow Effect */}
        <div className="absolute inset-0 scale-125">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 opacity-60 animate-pulse blur-lg" />
        </div>

        {/* Floating Particles - Mobile */}
        <div className="absolute -inset-4 overflow-visible pointer-events-none">
          <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce opacity-60" style={{ animationDelay: '0s' }} />
          <div className="absolute bottom-0 right-0 w-1 h-1 bg-blue-400 rounded-full animate-bounce opacity-50" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* FAB Button */}
        <button
          onClick={() => setShowMobilePopup(true)}
          className="relative w-14 h-14 rounded-full flex items-center justify-center text-white transition-all duration-300 active:scale-90"
          style={{
            background: "linear-gradient(135deg, #1e40af 0%, #0891b2 50%, #1e40af 100%)",
            backgroundSize: "200% 200%",
            boxShadow: `
              0 0 20px rgba(59, 130, 246, 0.6),
              0 0 40px rgba(59, 130, 246, 0.4),
              0 0 60px rgba(59, 130, 246, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.3)
            `,
          }}
        >
          {/* Shimmer */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-pulse" />
          </div>

          {/* Icon */}
          <Download className="w-6 h-6 relative z-10" />

          {/* Pulse Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/50 animate-ping opacity-20" />
        </button>
      </div>

      {/* Mobile/Desktop Popup Modal */}
      {showMobilePopup && !showIOSInstructions && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowMobilePopup(false);
              setShowDesktopMessage(false);
            }}
          />
 
          {/* Modal Content */}
          <div className="relative w-full max-w-sm animate-slide-up">
            {/* Glow Background */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/20 via-cyan-400/20 to-blue-500/20 blur-xl" />
 
            <div className="relative bg-slate-900/95 border border-cyan-500/30 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowMobilePopup(false);
                  setShowDesktopMessage(false);
                }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
 
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 mb-4 shadow-lg">
                  {showDesktopMessage ? (
                    <Smartphone className="w-8 h-8 text-white animate-bounce" />
                  ) : deviceType === "ios" ? (
                    <Apple className="w-8 h-8 text-white" />
                  ) : (
                    <Smartphone className="w-8 h-8 text-white" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-white">
                  {showDesktopMessage ? "Buka di HP" : "Install Aplikasi"}
                </h3>
                <p className="text-sm text-cyan-200/70 mt-2">
                  {showDesktopMessage 
                    ? "Gunakan perangkat Android atau iOS untuk menginstall aplikasi ini."
                    : "Nikmati pengalaman lebih baik dengan aplikasi native."}
                </p>
              </div>
 
              {!showDesktopMessage && (
                <>
                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    {[
                      "Akses offline tanpa internet",
                      "Notifikasi real-time",
                      "Performa lebih cepat",
                      "Integrasi native device"
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                        {feature}
                      </div>
                    ))}
                  </div>
 
                  {/* Download Button */}
                    <button
                    onClick={handleDownload}
                    className="w-full py-4 rounded-2xl font-bold text-white transition-all duration-300 active:scale-95 relative overflow-hidden group"
                    style={{
                      background: "linear-gradient(135deg, #1e40af 0%, #0891b2 50%, #1e40af 100%)",
                      boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.5)",
                    }}
                  >
                    <div className="relative flex items-center justify-center gap-2">
                      <Download className="w-5 h-5 group-hover:animate-bounce" />
                      <span className="text-sm uppercase tracking-wider">
                        {getDownloadText()}
                      </span>
                    </div>
                  </button>
                </>
              )}
 
              {showDesktopMessage && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <p className="text-sm text-gray-300">
                      Scan QR Code ini atau buka langsung alamat situs ini di browser ponsel Anda.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowMobilePopup(false);
                      setShowDesktopMessage(false);
                    }}
                    className="w-full py-3 rounded-2xl font-semibold text-white/80 border border-white/10 hover:bg-white/5 transition-all"
                  >
                    Tutup
                  </button>
                </div>
              )}
 
              {/* Dismiss Link */}
              {!showDesktopMessage && (
                <button
                  onClick={() => {
                    setIsVisible(false);
                    setShowMobilePopup(false);
                  }}
                  className="w-full mt-4 py-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                >
                  Jangan tampilkan lagi
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center xl:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowIOSInstructions(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-sm mx-3 mb-6 animate-slide-up">
            {/* Glow Background */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/20 via-cyan-400/20 to-blue-500/20 blur-xl" />

            <div className="relative bg-slate-900/95 border border-cyan-500/30 rounded-3xl p-5 backdrop-blur-xl shadow-2xl">
              {/* Close Button */}
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 mb-3 shadow-lg border border-gray-600">
                  <Apple className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Install di iOS
                </h3>
                <p className="text-sm text-cyan-200/70 mt-1">
                  Pilih metode instalasi
                </p>
              </div>

              {/* Option 1: Add to Home Screen (PWA) */}
              <div className="mb-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                    <PlusSquare className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Add to Home Screen</p>
                    <p className="text-xs text-gray-400">Cara termudah (PWA)</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">1</span>
                    <span>Ketuk tombol <Share2 className="w-4 h-4 inline mx-1 text-blue-400" /> Share di bawah</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">2</span>
                    <span>Pilih &quot;Add to Home Screen&quot;</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">3</span>
                    <span>Ketuk &quot;Add&quot; di pojok kanan atas</span>
                  </div>
                </div>
              </div>

              {/* Option 2: Download IPA */}
              <button
                onClick={handleIOSIPAInstall}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 border border-cyan-400/30 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold text-sm">Download IPA</p>
                    <p className="text-xs text-cyan-200/70">app-release.ipa</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>

              {/* Back Button */}
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="w-full mt-3 py-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                ← Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Download Button - xl screens only */}
      <div 
        className="fixed bottom-6 right-6 z-[100] hidden xl:flex"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Glow Effect Container */}
        <div className="relative">
          {/* Animated Glow Rings */}
          <div className="absolute inset-0 scale-150">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 opacity-30 animate-pulse blur-xl" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 opacity-20 animate-pulse blur-lg" style={{ animationDelay: '0.5s' }} />
          </div>

          {/* Floating Particles */}
          <div className="absolute -inset-8 overflow-visible pointer-events-none">
            <div className="absolute top-0 left-1/2 w-2 h-2 bg-cyan-400 rounded-full animate-bounce opacity-60" />
            <div className="absolute top-1/4 right-0 w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce opacity-50" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-1/4 left-0 w-1 h-1 bg-cyan-300 rounded-full animate-bounce opacity-70" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-0 right-1/4 w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce opacity-40" style={{ animationDelay: '1.5s' }} />
          </div>

          {/* Button */}
          <button
            onClick={handleDownload}
            className="relative group flex items-center gap-3 px-6 py-4 rounded-2xl font-semibold text-white transition-all duration-300 transform hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #1e40af 0%, #0891b2 50%, #1e40af 100%)",
              backgroundSize: "200% 200%",
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

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </>
  );
}
