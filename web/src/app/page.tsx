"use client"

import { useEffect, useState } from "react"
import CollageEditor from "@/components/CollageEditor"

export default function Page() {
  const [layout, setLayout] = useState<any>(null)

  useEffect(() => {
    fetch("/config/layout-config.json")
      .then((res) => {
        if (!res.ok) throw new Error("config not found")
        return res.json()
      })
      .then((data) => setLayout(data))
      .catch((err) => {
        console.error("Layout config load failed:", err)
        setLayout({
          layout: {
            type: "mobile",
            width: 390,
            height: 844
          },
          components: [
            {
              type: "text",
              text: "Static Fallback Loaded"
            },
            {
              type: "collage"
            }
          ]
        })
      })
  }, [])

  if (!layout) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0f1a] text-white p-10">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm tracking-widest uppercase opacity-50">Loading Web App...</p>
        </div>
      </div>
    )
  }

  const renderComponent = (c: any, i: number) => {
    switch (c.type) {
      case "header":
        return (
          <div key={i} className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-white">{c.text}</h1>
            <div className="h-1 w-12 bg-blue-500 mt-2 rounded-full"></div>
          </div>
        )
      case "collage":
        return <CollageEditor key={i} />
      case "footer":
        return (
          <div key={i} className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-white/40 uppercase tracking-[0.2em]">{c.text}</p>
          </div>
        )
      case "text":
      default:
        return (
          <div key={i} className="mb-4 text-white/80">
            {c.text}
          </div>
        )
    }
  }

  return (
    <div
      style={{
        maxWidth: layout.layout?.width || 390,
        minHeight: layout.layout?.height || 844,
        margin: "40px auto",
        borderRadius: 40,
        border: "8px solid #1e293b",
        background: "#0f172a",
        color: "#fff",
        padding: 30,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}
      className="relative overflow-auto"
    >
      {layout.components?.map((c: any, i: number) => renderComponent(c, i))}
    </div>
  )
}
