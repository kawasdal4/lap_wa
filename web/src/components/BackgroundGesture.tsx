"use client"

import { useRef, useState } from "react"

interface BackgroundGestureProps {
  src: string | null
}

export default function BackgroundGesture({ src }: BackgroundGestureProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const [scale, setScale] = useState(1)
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)

  const start = useRef({ x: 0, y: 0 })
  const startPos = useRef({ x: 0, y: 0 })
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null)


  // ======================
  // DRAG BACKGROUND
  // ======================
  const onPointerDown = (e: React.PointerEvent) => {
    start.current = {
      x: e.clientX,
      y: e.clientY
    }

    startPos.current = { x, y }

    containerRef.current?.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current?.hasPointerCapture(e.pointerId)) return

    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y

    setX(startPos.current.x + dx)
    setY(startPos.current.y + dy)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    containerRef.current?.releasePointerCapture(e.pointerId)
  }


  // ======================
  // PINCH ZOOM
  // ======================
  const getDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchStart.current = {
        distance: getDistance(e.touches),
        scale
      }
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!pinchStart.current) return
    if (e.touches.length !== 2) return

    const newDistance = getDistance(e.touches)

    const newScale =
      pinchStart.current.scale *
      (newDistance / pinchStart.current.distance)

    setScale(Math.min(Math.max(newScale, 0.5), 4))
  }


  // ======================
  // DESKTOP ZOOM
  // ======================
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()

    const zoom = -e.deltaY * 0.001

    setScale(prev => {
      const next = prev + zoom
      return Math.min(Math.max(next, 0.5), 4)
    })
  }


  // ======================
  // RENDER
  // ======================
  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden touch-auto"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onWheel={onWheel}
    >
      {src && (
        <img
          src={src}
          alt="background"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover select-none"
          style={{
            transform: `translate(${x}px,${y}px) scale(${scale})`,
            transformOrigin: "center"
          }}
        />
      )}
    </div>
  )
}
