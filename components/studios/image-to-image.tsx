"use client"

import React from "react"

import type { Profile, Generation } from "@/lib/types"
import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sparkles,
  Loader2,
  Upload,
  ArrowRight,
  ImageIcon,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"

interface ImageToImageProps {
  profile: Profile | null
  generations: Generation[]
}

const STYLES = [
  { id: "none", name: "No Style Change" },
  { id: "digital-art", name: "Digital Art" },
  { id: "anime", name: "Anime" },
  { id: "oil-painting", name: "Oil Painting" },
  { id: "watercolor", name: "Watercolor" },
  { id: "sketch", name: "Sketch" },
  { id: "3d-render", name: "3D Render" },
  { id: "pixel-art", name: "Pixel Art" },
]

const CREDIT_COST = 1

export function ImageToImage({ profile, generations }: ImageToImageProps) {
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [strength, setStrength] = useState(70)
  const [style, setStyle] = useState("none")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const imageGenerations = generations.filter(g => g.type === "image" && g.result_url)
  const canGenerate = profile?.role === "admin" || (profile?.credits || 0) >= CREDIT_COST

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setReferenceImage(url)
      setGeneratedImage(null)
    }
  }

  const selectFromGallery = (url: string) => {
    setReferenceImage(url)
    setGeneratedImage(null)
  }

  const handleGenerate = async () => {
    if (!referenceImage) {
      toast.error("Please select a reference image")
      return
    }

    if (!prompt.trim()) {
      toast.error("Please enter a prompt describing the transformation")
      return
    }

    if (!canGenerate) {
      toast.error("Insufficient credits")
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/image/img2img", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          referenceImage,
          strength: strength / 100,
          style: style !== "none" ? style : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Generation failed")
      }

      if (data.images?.[0]) {
        setGeneratedImage(data.images[0])
        toast.success("Image generated successfully!")
        router.refresh()
      }
    } catch (error) {
      console.error("[v0] img2img error:", error)
      toast.error(error instanceof Error ? error.message : "Generation failed")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Image to Image
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reference Image Selection */}
          <div className="space-y-2">
            <Label>Reference Image</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors
                ${referenceImage 
                  ? "border-primary/50" 
                  : "border-muted-foreground/25 hover:border-primary/50"
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              {referenceImage ? (
                <img
                  src={referenceImage || "/placeholder.svg"}
                  alt="Reference"
                  className="w-full max-h-48 object-contain rounded"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag & drop
                  </p>
                </div>
              )}
            </div>

            {/* Gallery Selection */}
            {imageGenerations.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Or select from gallery:</p>
                <div className="grid grid-cols-6 gap-1">
                  {imageGenerations.slice(0, 12).map((gen) => (
                    <button
                      key={gen.id}
                      onClick={() => selectFromGallery(gen.result_url!)}
                      className={`aspect-square rounded overflow-hidden border-2 transition-all ${
                        referenceImage === gen.result_url 
                          ? "border-primary" 
                          : "border-transparent hover:border-muted"
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
              </div>
            )}
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label>Transformation Prompt</Label>
            <Textarea
              placeholder="Describe how you want to transform the image... e.g., 'Turn this into a watercolor painting' or 'Make it look like winter with snow'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>

          {/* Style */}
          <div className="space-y-2">
            <Label>Style Transfer</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger>
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Strength */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Transformation Strength</Label>
              <span className="text-sm text-muted-foreground">{strength}%</span>
            </div>
            <Slider
              value={[strength]}
              onValueChange={([v]) => setStrength(v)}
              min={10}
              max={100}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              Lower = closer to original, Higher = more creative
            </p>
          </div>

          {/* Cost & Generate */}
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <span className="text-sm text-muted-foreground">Cost: {CREDIT_COST} credit</span>
            <span className="text-sm font-medium">
              Balance: {profile?.role === "admin" ? "Unlimited" : profile?.credits || 0}
            </span>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !canGenerate || !referenceImage}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Variation
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview / Result */}
      <Card>
        <CardHeader>
          <CardTitle>Result</CardTitle>
        </CardHeader>
        <CardContent>
          {referenceImage || generatedImage ? (
            <div className="space-y-4">
              {/* Comparison View */}
              <div className="grid grid-cols-2 gap-4">
                {/* Original */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-center">Original</p>
                  <div className="aspect-square rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
                    {referenceImage ? (
                      <img
                        src={referenceImage || "/placeholder.svg"}
                        alt="Original"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                    )}
                  </div>
                </div>

                {/* Generated */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-center">Generated</p>
                  <div className="aspect-square rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
                    {isGenerating ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Generating...</p>
                      </div>
                    ) : generatedImage ? (
                      <img
                        src={generatedImage || "/placeholder.svg"}
                        alt="Generated"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                        <ArrowRight className="h-8 w-8" />
                        <p className="text-xs">Result will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Download Button */}
              {generatedImage && (
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => {
                    const a = document.createElement("a")
                    a.href = generatedImage
                    a.download = `img2img-${Date.now()}.png`
                    a.click()
                    toast.success("Image downloaded!")
                  }}
                >
                  Download Result
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
              <Wand2 className="h-12 w-12 mb-4 opacity-50" />
              <p>Select a reference image to start</p>
              <p className="text-sm mt-1">Transform your images with AI</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
