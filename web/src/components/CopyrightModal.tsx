"use client"

import React from "react"
import { Shield, Smartphone, Info, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function CopyrightModal({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md bg-[#0b0f1a] border-[#222] text-white p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-[#d946ef] to-[#ef4444] p-6 flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight">HAK CIPTA</h2>
            <p className="text-white/80 text-sm">Copyright Notice</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <section className="space-y-2">
            <div className="flex items-center gap-3 text-white/60 text-xs font-semibold uppercase tracking-wider">
              <Info className="w-3 h-3" />
              <span>Developer & Maintenance</span>
            </div>
            <p className="text-lg font-semibold text-white">
              Muhammad Fuadunnas, S.I.Kom., M.IKom.
            </p>
            <p className="text-sm text-white/70">
              PKPP Ahli Muda – Direktorat Kesiapsiagaan
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-white/5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase text-white/40 block">Application</span>
                <p className="text-sm font-medium">WA Report Generator</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase text-white/40 block">Organization</span>
                <p className="text-sm font-medium leading-snug">Direktorat Kesiapsiagaan (Badan SAR Nasional)</p>
              </div>
            </div>
          </section>

          <section className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                    <Smartphone className="w-4 h-4 text-orange-400" />
                    <span className="text-sm">(+62) 811 9292 91</span>
                </div>
                <span className="text-[10px] text-white/30 truncate max-w-[120px]">Jakarta – Indonesia</span>
              </div>
          </section>

          <div className="text-center pt-2">
            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">
              © 2026 FOE - All Rights Reserved
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
