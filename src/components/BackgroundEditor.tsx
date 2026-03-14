"use client"

import { useRef, useState } from "react"

interface BackgroundEditorProps {
  background: string | null
}

export default function BackgroundEditor({ background }: BackgroundEditorProps) {
  const canvasRef = useRef(null)

  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const startPos = useRef<{ x: number; y: number } | null>(null)

  const pinchStart = useRef<{ distance: number; scale: number } | null>(null)


  // ============================
  // DRAG BACKGROUND
  // ============================
  const handlePointerDown = (e: React.PointerEvent) => {
    dragStart.current = {
      x: e.clientX,
      y: e.clientY
    }

    startPos.current = { ...position }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return

    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y

    setPosition({
      x: startPos.current!.x + dx,
      y: startPos.current!.y + dy
    })
  }

  const handlePointerUp = () => {
    dragStart.current = null
  }


  // ============================
  // PINCH ZOOM MOBILE
  // ============================
  const getDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchStart.current = {
        distance: getDistance(e.touches),
        scale: scale
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pinchStart.current || e.touches.length !== 2) return

    const newDistance = getDistance(e.touches)

    const nextScale =
      pinchStart.current.scale * (newDistance / pinchStart.current.distance)

    setScale(Math.min(Math.max(nextScale, 0.5), 4))
  }


  // ============================
  // DESKTOP ZOOM
  // ============================
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()

    const zoom = -e.deltaY * 0.001

    setScale(prev => {
      const next = prev + zoom
      return Math.min(Math.max(next, 0.5), 4)
    })
  }


  // ============================
  // RENDER
  // ============================
  return (
    <div
      ref={canvasRef}
      className="absolute inset-0 overflow-hidden touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onWheel={handleWheel}
    >
      {background && (
        <img
          src={background}
          alt="background"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          style={{
            transform: `translate(${position.x}px,${position.y}px) scale(${scale})`,
            transformOrigin: "center center"
          }}
        />
      )}
    </div>
  )
}
