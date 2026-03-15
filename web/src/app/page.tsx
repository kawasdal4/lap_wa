"use client"

import { useEffect, useState } from "react"

export default function Page() {
  const [layout, setLayout] = useState<any>(null)

  useEffect(() => {
    fetch("/config/layout-config.json")
      .then((res) => res.json())
      .then((data) => {
        setLayout(data)
      })
      .catch(() => {
        console.error("layout config gagal dimuat")
      })
  }, [])

  if (!layout) {
    return (
      <div style={{color:"#fff",padding:40}}>
        Loading Web App...
      </div>
    )
  }

  return (
    <div
      style={{
        width: layout.layout?.width || 390,
        height: layout.layout?.height || 844,
        margin: "40px auto",
        borderRadius: 40,
        border: "4px solid #1e293b",
        background: "#0f172a",
        color: "#fff",
        padding: 20
      }}
    >
      {layout.components?.map((c: any, i: number) => (
        <div key={i} style={{marginBottom:20}}>
          {c.text}
        </div>
      ))}
    </div>
  )
}
