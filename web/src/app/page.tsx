"use client"

import { useEffect, useState } from "react"

export default function Page() {
  const [layout, setLayout] = useState<any>(null)

  useEffect(() => {
    fetch("/config/layout-config.json")
      .then((res) => {
        if (!res.ok) throw new Error("config not found")
        return res.json()
      })
      .then((data) => setLayout(data))
      .catch(() => {
        setLayout({
          layout: {
            type: "mobile",
            width: 390,
            height: 844
          },
          components: [
            {
              type: "text",
              text: "App Loaded"
            }
          ]
        })
      })
  }, [])

  if (!layout) {
    return (
      <div style={{color:"#fff",padding:40}}>
        Loading app...
      </div>
    )
  }

  return (
    <div
      style={{
        width: 390,
        height: 844,
        margin: "40px auto",
        borderRadius: 40,
        border: "4px solid #1e293b",
        background: "#0f172a",
        color: "#fff",
        padding: 20
      }}
    >
      {layout.components?.map((c: any, i: number) => (
        <div key={i}>{c.text}</div>
      ))}
    </div>
  )
}
