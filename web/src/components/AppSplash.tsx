"use client"

import React, { useEffect, useState } from 'react'

export default function AppSplash() {
  const [progress, setProgress] = useState(0)
  
  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + Math.random() * 15 + 5
      })
    }, 150)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#0b0f1a] via-[#0e1420] to-[#0b0f1a] z-[9999]">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }} />
      </div>
      
      {/* Logo Container */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Animated Logo Glow */}
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-amber-500/20 rounded-3xl blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1a2235] to-[#0d1320] border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
            <img 
              src="https://www.e-katalog-sop.cloud/sulapfoto_nomg_1.png" 
              alt="Logo" 
              className="w-14 h-14 object-cover"
            />
          </div>
        </div>
        
        {/* App Name */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-orange-100 to-white bg-clip-text text-transparent">
            Laporan WA
          </h1>
          <p className="text-xs text-white/40 tracking-[0.2em] uppercase">
            Basarnas
          </p>
        </div>
        
        {/* Loading Indicator */}
        <div className="flex flex-col items-center gap-3 mt-4">
          {/* Progress Bar */}
          <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 rounded-full transition-all duration-200 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          
          {/* Loading Dots */}
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div 
                key={i}
                className="w-1.5 h-1.5 bg-orange-500/60 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Bottom Text */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-[10px] text-white/20 tracking-wider">
          Direktorat Kesiapsiagaan
        </p>
      </div>
    </div>
  )
}
