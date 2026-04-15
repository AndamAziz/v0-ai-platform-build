"use client"

import React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Edit3,
  Loader2,
  Download,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Sun,
  Contrast,
  Droplets,
  Save,
  Upload,
  Type,
  Undo,
  Wand2,
  Eraser,
  ZoomIn,
  Sparkles,
  ChevronDown,
} from "lucide-react"
import { toast } from "sonner"
import type { Generation } from "@/lib/types"

interface ImageEditorProps {
  generations: Generation[]
}

const FILTERS = [
  { id: "none", name: "None" },
  { id: "grayscale", name: "Grayscale" },
  { id: "sepia", name: "Sepia" },
  { id: "invert", name: "Invert" },
  { id: "blur", name: "Blur" },
  { id: "sharpen", name: "Sharpen" },
]

export function ImageEditor({ generations }: ImageEditorProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [filter, setFilter] = useState("none")
  const [textOverlay, setTextOverlay] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [exportFormat, setExportFormat] = useState<"png" | "jpg" | "webp">("png")
  const [isAIProcessing, setIsAIProcessing] = useState(false)
  const [aiProcessingType, setAIProcessingType] = useState<string>("")
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const imageGenerations = generations.filter(g => g.type === "image" && g.result_url)

  const resetEdits = useCallback(() => {
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
    setFilter("none")
    setTextOverlay("")
  }, [])

  const loadImage = useCallback((url: string) => {
    setSelectedImage(url)
    resetEdits()
    
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      imageRef.current = img
      renderCanvas()
    }
    img.src = url
  }, [resetEdits])

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = img.width
    canvas.height = img.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Save context state
    ctx.save()

    // Apply transformations
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)

    // Apply filters
    let filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    
    switch (filter) {
      case "grayscale":
        filterString += " grayscale(100%)"
        break
      case "sepia":
        filterString += " sepia(100%)"
        break
      case "invert":
        filterString += " invert(100%)"
        break
      case "blur":
        filterString += " blur(2px)"
        break
    }
    
    ctx.filter = filterString

    // Draw image
    ctx.drawImage(img, 0, 0)

    // Reset filter for text
    ctx.filter = "none"

    // Add text overlay
    if (textOverlay) {
      ctx.font = "bold 48px Arial"
      ctx.fillStyle = "white"
      ctx.strokeStyle = "black"
      ctx.lineWidth = 2
      ctx.textAlign = "center"
      ctx.strokeText(textOverlay, canvas.width / 2, canvas.height - 50)
      ctx.fillText(textOverlay, canvas.width / 2, canvas.height - 50)
    }

    // Restore context state
    ctx.restore()
  }, [brightness, contrast, saturation, rotation, flipH, flipV, filter, textOverlay])

  useEffect(() => {
    if (selectedImage) {
      renderCanvas()
    }
  }, [selectedImage, brightness, contrast, saturation, rotation, flipH, flipV, filter, textOverlay, renderCanvas])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      loadImage(url)
    }
  }

  const handleSave = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsSaving(true)
    try {
      const mimeType = exportFormat === "jpg" ? "image/jpeg" : exportFormat === "webp" ? "image/webp" : "image/png"
      const dataUrl = canvas.toDataURL(mimeType, 0.9)

      const response = await fetch("/api/image/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: dataUrl,
          format: exportFormat,
          quality: 0.9,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Save failed")
      }

      toast.success("Image saved successfully!")
      router.refresh()
    } catch (error) {
      console.error("[v0] Save error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const mimeType = exportFormat === "jpg" ? "image/jpeg" : exportFormat === "webp" ? "image/webp" : "image/png"
    const dataUrl = canvas.toDataURL(mimeType, 0.9)
    
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = `edited-image-${Date.now()}.${exportFormat}`
    a.click()
    
    toast.success("Image downloaded!")
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Editor Controls */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Image
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Image Selection */}
          <div className="space-y-2">
            <Label>Select Image</Label>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            
            {imageGenerations.length > 0 && (
              <div className="grid grid-cols-4 gap-1 mt-2">
                {imageGenerations.slice(0, 8).map((gen) => (
                  <button
                    key={gen.id}
                    onClick={() => loadImage(gen.result_url!)}
                    className={`aspect-square rounded overflow-hidden border-2 transition-all ${
                      selectedImage === gen.result_url ? "border-primary" : "border-transparent hover:border-muted"
                    }`}
                  >
                    <img
                      src={gen.result_url! || "/placeholder.svg"}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedImage && (
            <>
              {/* Adjustments */}
              <div className="space-y-4">
                <Label>Adjustments</Label>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Sun className="h-3 w-3" /> Brightness
                    </span>
                    <span>{brightness}%</span>
                  </div>
                  <Slider
                    value={[brightness]}
                    onValueChange={([v]) => setBrightness(v)}
                    min={0}
                    max={200}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Contrast className="h-3 w-3" /> Contrast
                    </span>
                    <span>{contrast}%</span>
                  </div>
                  <Slider
                    value={[contrast]}
                    onValueChange={([v]) => setContrast(v)}
                    min={0}
                    max={200}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Droplets className="h-3 w-3" /> Saturation
                    </span>
                    <span>{saturation}%</span>
                  </div>
                  <Slider
                    value={[saturation]}
                    onValueChange={([v]) => setSaturation(v)}
                    min={0}
                    max={200}
                    step={1}
                  />
                </div>
              </div>

              {/* Transform */}
              <div className="space-y-2">
                <Label>Transform</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setRotation(r => r - 90)}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setRotation(r => r + 90)}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={flipH ? "default" : "outline"}
                    size="icon"
                    onClick={() => setFlipH(f => !f)}
                  >
                    <FlipHorizontal className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={flipV ? "default" : "outline"}
                    size="icon"
                    onClick={() => setFlipV(f => !f)}
                  >
                    <FlipVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-2">
                <Label>Filters</Label>
                <div className="grid grid-cols-3 gap-1">
                  {FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`px-2 py-1.5 text-xs rounded border transition-all ${
                        filter === f.id 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Overlay */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Type className="h-3 w-3" /> Text Overlay
                </Label>
                <Input
                  placeholder="Add text..."
                  value={textOverlay}
                  onChange={(e) => setTextOverlay(e.target.value)}
                />
              </div>

              {/* AI Tools Dropdown */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI Tools
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20"
                      disabled={isAIProcessing || !selectedImage}
                    >
                      <span className="flex items-center gap-2">
                        {isAIProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {aiProcessingType === "upscale" && "Upscaling..."}
                            {aiProcessingType === "remove-bg" && "Removing BG..."}
                            {aiProcessingType === "enhance" && "Enhancing..."}
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            Select AI Tool
                          </>
                        )}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      AI Enhancement Tools
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="flex cursor-pointer items-center gap-3 py-3"
                      onClick={async () => {
                        if (!selectedImage || isAIProcessing) return
                        setIsAIProcessing(true)
                        setAIProcessingType("upscale")
                        try {
                          const res = await fetch("/api/image/ai-upscale", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ imageUrl: selectedImage, scale: 2 }),
                          })
                          const data = await res.json()
                          if (!res.ok) throw new Error(data.error)
                          loadImage(data.url)
                          toast.success("Image upscaled 2x!")
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Upscale failed")
                        } finally {
                          setIsAIProcessing(false)
                          setAIProcessingType("")
                        }
                      }}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                        <ZoomIn className="h-4 w-4 text-purple-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">Upscale 2x</span>
                        <span className="text-xs text-muted-foreground">Increase resolution</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex cursor-pointer items-center gap-3 py-3"
                      onClick={async () => {
                        if (!selectedImage || isAIProcessing || !canvasRef.current) return
                        setIsAIProcessing(true)
                        setAIProcessingType("remove-bg")
                        try {
                          toast.info("Removing background... This may take 10-30 seconds.")
                          
                          // Use client-side background removal (no API needed)
                          const { removeBackground } = await import("@imgly/background-removal")
                          
                          // Get image from canvas as blob
                          const sourceCanvas = canvasRef.current
                          const blob = await new Promise<Blob>((resolve) => {
                            sourceCanvas.toBlob((b) => resolve(b!), "image/png")
                          })
                          
                          // Remove background directly in browser
                          const resultBlob = await removeBackground(blob, {
                            progress: (key: string, current: number, total: number) => {
                              if (key === "compute:inference") {
                                const pct = Math.round((current / total) * 100)
                                if (pct % 25 === 0) {
                                  console.log(`[v0] BG removal progress: ${pct}%`)
                                }
                              }
                            },
                          })
                          
                          // Convert result blob to URL and load
                          const resultUrl = URL.createObjectURL(resultBlob)
                          loadImage(resultUrl)
                          toast.success("Background removed!")
                        } catch (err) {
                          console.error("[v0] Remove BG error:", err)
                          toast.error(err instanceof Error ? err.message : "Remove BG failed")
                        } finally {
                          setIsAIProcessing(false)
                          setAIProcessingType("")
                        }
                      }}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                        <Eraser className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">Remove Background</span>
                        <span className="text-xs text-muted-foreground">Transparent background</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex cursor-pointer items-center gap-3 py-3"
                      onClick={async () => {
                        if (!selectedImage || isAIProcessing) return
                        setIsAIProcessing(true)
                        setAIProcessingType("enhance")
                        try {
                          const res = await fetch("/api/image/ai-enhance", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ imageUrl: selectedImage, enhanceType: "general" }),
                          })
                          const data = await res.json()
                          if (!res.ok) throw new Error(data.error)
                          loadImage(data.url)
                          toast.success("Image enhanced!")
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Enhance failed")
                        } finally {
                          setIsAIProcessing(false)
                          setAIProcessingType("")
                        }
                      }}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                        <Wand2 className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">AI Enhance</span>
                        <span className="text-xs text-muted-foreground">Improve quality</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-center text-xs text-muted-foreground">
                      1 credit per use
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Export Format */}
              <div className="space-y-2">
                <Label>Export Format</Label>
                <div className="flex gap-2">
                  {(["png", "jpg", "webp"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className={`flex-1 px-2 py-1.5 text-xs rounded border transition-all uppercase ${
                        exportFormat === fmt 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetEdits} className="flex-1 bg-transparent">
                  <Undo className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button variant="outline" onClick={handleDownload} className="flex-1 bg-transparent">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
              
              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save to Library
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Canvas Preview */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedImage ? (
            <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4 min-h-[400px]">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[600px] rounded-lg shadow-lg"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
              <Edit3 className="h-12 w-12 mb-4 opacity-50" />
              <p>Select an image to start editing</p>
              <p className="text-sm mt-1">Upload a new image or choose from your gallery</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
