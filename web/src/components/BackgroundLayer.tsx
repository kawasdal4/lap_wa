"use client"

import { useRef, useState } from "react"

interface BackgroundLayerProps {
  src: string
  onScaleChange?: (scale: number) => void
  onPositionChange?: (position: { x: number; y: number }) => void
  initialScale?: number
  initialPosition?: { x: number; y: number }
  active?: boolean
}

export default function BackgroundLayer({
  src,
  onScaleChange,
  onPositionChange,
  initialScale = 1,
  initialPosition = { x: 0, y: 0 },
  active = false
}: BackgroundLayerProps) {

  const containerRef = useRef(null)

  const [scale, setScale] = useState(initialScale)
  const [position, setPosition] = useState(initialPosition)

  const dragStart = useRef(null)
  const pinchStart = useRef(null)


  // ====================
  // DRAG BACKGROUND
  // ====================

  const onPointerDown = (e) => {
    if (!active) return

    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      startX: position.x,
      startY: position.y
    }
  }

  const onPointerMove = (e) => {
    if (!active || !dragStart.current) return

    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y

    const newPosition = {
      x: dragStart.current.startX + dx,
      y: dragStart.current.startY + dy
    }

    setPosition(newPosition)
    onPositionChange?.(newPosition)
  }

  const onPointerUp = () => {
    dragStart.current = null
  }


  // ====================
  // PINCH ZOOM
  // ====================

  const getDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchStart.current = {
        distance: getDistance(e.touches),
        scale
      }
    }
  }

  const onTouchMove = (e) => {
    if (!pinchStart.current) return
    if (e.touches.length !== 2) return

    const newDistance = getDistance(e.touches)

    const nextScale =
      pinchStart.current.scale *
      (newDistance / pinchStart.current.distance)

    const clampedScale = Math.min(Math.max(nextScale, 0.5), 4)
    setScale(clampedScale)
    onScaleChange?.(clampedScale)
  }


  // ====================
  // DESKTOP ZOOM
  // ====================

  const onWheel = (e) => {
    e.preventDefault()
    const zoom = -e.deltaY * 0.001
    setScale(prev => {
      const next = prev + zoom
      const clampedScale = Math.min(Math.max(next, 0.5), 4)
      onScaleChange?.(clampedScale)
      return clampedScale
    })
  }


  // ====================
  // RENDER
  // ====================

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ touchAction: active ? "none" : "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onWheel={onWheel}
    >
      <img
        src={src}
        alt="Background"
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover select-none"
        style={{
          transform: `translate(${position.x}px,${position.y}px) scale(${scale})`,
          transformOrigin: "center"
        }}
      />
    </div>
  )
}
