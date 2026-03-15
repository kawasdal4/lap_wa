"use client"

import { useRef, useState, useEffect } from "react"
import { toJpeg } from "html-to-image"
import { sanitizeColors } from "@/lib/dom-utils"

export default function CollageEditor() {
  const canvasRef = useRef<HTMLDivElement>(null)

  const [photos, setPhotos] = useState<any[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const [bgScale, setBgScale] = useState(1)
  const [bgImage, setBgImage] = useState<string | null>(null)

  const [showGuide, setShowGuide] = useState(false)

  const SNAP = 8
  const startDistanceRef = useRef(0)

  // =======================
  // upload photos
  // =======================
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)

    // Auto grid layout calculation
    const newCount = files.length
    const existingCount = photos.length
    const totalCount = existingCount + newCount
    const cols = Math.ceil(Math.sqrt(totalCount))
    const size = 100 / cols

    const newPhotos = files.map((file, i) => {
      const index = existingCount + i
      return {
        id: Date.now() + i,
        url: URL.createObjectURL(file as unknown as Blob),
        x: (index % cols) * size,
        y: Math.floor(index / cols) * size,
        width: 150,
        height: 150
      }
    })

    // Recalculate existing photos positions
    const updatedExisting = photos.map((p, i) => ({
      ...p,
      x: (i % cols) * size,
      y: Math.floor(i / cols) * size
    }))

    setPhotos([...updatedExisting, ...newPhotos])
  }

  // =======================
  // drag photo
  // =======================
  const handlePointerDown = (i: number, e: React.PointerEvent) => {
    setDragIndex(i)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragIndex === null || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()

    let x = ((e.clientX - rect.left) / rect.width) * 100
    let y = ((e.clientY - rect.top) / rect.height) * 100

    // snap center
    if (Math.abs(x - 50) < SNAP) {
      x = 50
      setShowGuide(true)
    } else {
      setShowGuide(false)
    }

    setPhotos(prev => {
      const updated = [...prev]
      updated[dragIndex] = { ...updated[dragIndex], x, y }
      return updated
    })
  }

  const handlePointerUp = () => {
    setDragIndex(null)
  }

  // =======================
  // resize photo
  // =======================
  const handleResize = (i: number, dx: number, dy: number) => {
    setPhotos(prev => {
      const updated = [...prev]
      updated[i] = {
        ...updated[i],
        width: updated[i].width + dx,
        height: updated[i].height + dy
      }
      return updated
    })
  }

  // =======================
  // pinch zoom background
  // =======================
  const getDistance = (touches: React.TouchList | TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      startDistanceRef.current = getDistance(e.touches)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return

    const dist = getDistance(e.touches)

    if (!startDistanceRef.current) {
      startDistanceRef.current = dist
      return
    }

    const scale = dist / startDistanceRef.current

    setBgScale(prev => prev * scale)
    startDistanceRef.current = dist
  }

  // =======================
  // export image
  // =======================
  const exportImage = async () => {
    if (!canvasRef.current) return

    // Create a clone for sanitization
    const clone = canvasRef.current.cloneNode(true) as HTMLElement
    document.body.appendChild(clone)
    sanitizeColors(clone)
    
    try {
      const dataUrl = await toJpeg(clone, {
        quality: 1.0,
        pixelRatio: window.devicePixelRatio * 2,
        cacheBust: true
      })

      const link = document.createElement("a")
      link.download = `collage-${Date.now()}.jpg`
      link.href = dataUrl
      link.click()
    } finally {
      document.body.removeChild(clone)
    }
  }

  // =======================
  // UI
  // =======================
  return (
    <div className="p-4 space-y-4">
      <input type="file" multiple onChange={handleUpload} />

      <button
        onClick={exportImage}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Export
      </button>

      <div
        ref={canvasRef}
        className="relative w-full max-w-sm aspect-[9/16] bg-black overflow-hidden mx-auto"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* background */}
        {bgImage && (
          <img
            src={bgImage}
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: `scale(${bgScale})` }}
          />
        )}

        {/* snap guideline */}
        {showGuide && (
          <div className="absolute left-1/2 top-0 h-full w-px bg-blue-400" />
        )}

        {/* photos */}
        {photos.map((p, i) => (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.width,
              height: p.height,
              transform: "translate(-50%,-50%)"
            }}
            onPointerDown={(e) => handlePointerDown(i, e)}
          >
            <img
              src={p.url}
              alt={`Photo ${i + 1}`}
              className="w-full h-full object-cover rounded"
            />

            {/* resize handle */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 bg-white cursor-se-resize"
              onPointerDown={(e) => {
                e.stopPropagation()

                const startX = e.clientX
                const startY = e.clientY

                const move = (ev: PointerEvent) => {
                  handleResize(
                    i,
                    (ev.clientX - startX) / 2,
                    (ev.clientY - startY) / 2
                  )
                }

                window.addEventListener("pointermove", move)

                window.addEventListener("pointerup", () => {
                  window.removeEventListener("pointermove", move)
                }, { once: true })
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
