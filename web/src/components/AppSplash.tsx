"use client"

import React from 'react'

export default function AppSplash() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0b0f1a] z-[9999]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
        <div className="animate-pulse text-white font-medium tracking-wider">
          LOADING APP...
        </div>
      </div>
    </div>
  )
}
