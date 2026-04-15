"use client"

import React from "react"

import { useState, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import type { Profile } from "@/lib/types"
import {
  Upload,
  Wand2,
  Download,
  Copy,
  Check,
  Loader2,
  ImagePlus,
  Sparkles,
  RefreshCw,
  X,
} from "lucide-react"

interface PortraitStudioProps {
  profile: Profile
}

const presetPrompts = [
  {
    name: "Kurdistan Flag Portrait",
    prompt: "Change the setting to a high-end luxurious place. The person is wearing an elegant black dress and the Kurdistan Region flag is draped over their shoulders. Cinematic lighting, photorealistic, 8k resolution. Preserve facial features exactly.",
  },
  {
    name: "Professional Headshot",
    prompt: "Transform into a professional corporate headshot. Person wearing a formal business suit in a modern office setting. Soft studio lighting, clean background, professional photography style. Preserve facial features exactly.",
  },
  {
    name: "Fantasy Portrait",
    prompt: "Transform into a fantasy character portrait. Magical glowing elements, ethereal atmosphere, dramatic lighting, fantasy art style. Keep the face and identity intact.",
  },
  {
    name: "Vintage Classic",
    prompt: "Transform into a classic vintage portrait from the 1950s. Elegant attire, soft sepia tones, vintage photography style, timeless elegance. Preserve the person's face exactly.",
  },
  {
    name: "Cyberpunk Style",
    prompt: "Transform into a cyberpunk character. Neon lighting, futuristic city background, high-tech accessories, sci-fi atmosphere. Keep facial features identical.",
  },
]

export function PortraitStudio({ profile }: PortraitStudioProps) {
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [sourceBase64, setSourceBase64] = useState<string | null>(null)
  const [sourceMimeType, setSourceMimeType] = useState<string | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [prompt, setPrompt] = useState(presetPrompts[0].prompt)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64String = e.target?.result as string
      setSourceImage(base64String)
      setSourceBase64(base64String.split(",")[1])
      setSourceMimeType(file.type)
      setResultImage(null)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleGenerate = async () => {
    if (!sourceBase64 || !sourceMimeType || !prompt.trim()) {
      toast.error("Please upload an image and enter a prompt")
      return
    }

    setIsGenerating(true)
    setResultImage(null)

    try {
      const response = await fetch("/api/portrait/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: sourceBase64,
          mimeType: sourceMimeType,
          prompt: prompt.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image")
      }

      if (data.image) {
        setResultImage(data.image)
        toast.success("Portrait generated successfully!")
      } else {
        throw new Error("No image returned")
      }
    } catch (error) {
      console.error("Generation failed:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate portrait")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!resultImage) return
    const link = document.createElement("a")
    link.href = resultImage
    link.download = `portrait-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Image downloaded!")
  }

  const handleCopy = async () => {
    if (!resultImage) return
    try {
      const response = await fetch(resultImage)
      const blob = await response.blob()
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
      setCopied(true)
      toast.success("Image copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Failed to copy image")
    }
  }

  const clearSource = () => {
    setSourceImage(null)
    setSourceBase64(null)
    setSourceMimeType(null)
    setResultImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Portrait Editor</h1>
        <p className="text-muted-foreground">
          Upload your photo and transform it with AI-powered editing
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Input */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Source Image
              </CardTitle>
              <CardDescription>Upload the photo you want to edit</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="relative"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                />

                {sourceImage ? (
                  <div className="relative">
                    <img
                      src={sourceImage || "/placeholder.svg"}
                      alt="Source"
                      className="h-64 w-full rounded-lg border object-cover"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute right-2 top-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        clearSource()
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:border-primary/50 hover:bg-muted">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ImagePlus className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prompt Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                Edit Instructions
              </CardTitle>
              <CardDescription>Describe how you want to transform the image</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preset Buttons */}
              <div className="flex flex-wrap gap-2">
                {presetPrompts.map((preset) => (
                  <Button
                    key={preset.name}
                    variant={prompt === preset.prompt ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPrompt(preset.prompt)}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Custom Prompt</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the transformation..."
                  rows={5}
                  className="resize-none"
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleGenerate}
                disabled={!sourceBase64 || !prompt.trim() || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Portrait
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Result */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Result
            </CardTitle>
            <CardDescription>Your transformed portrait will appear here</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <div className="relative flex flex-1 items-center justify-center rounded-lg border bg-muted/50">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="mt-4 font-medium">Processing image...</p>
                  <p className="mt-1 text-sm text-muted-foreground">This may take up to 30 seconds</p>
                </div>
              ) : resultImage ? (
                <img
                  src={resultImage || "/placeholder.svg"}
                  alt="Generated Result"
                  className="max-h-[500px] w-full rounded-lg object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <Sparkles className="h-12 w-12 opacity-50" />
                  <p className="mt-4 text-sm">Generated image will appear here</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {resultImage && (
              <div className="mt-4 flex gap-3">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button variant="outline" className="flex-1 bg-transparent" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setResultImage(null)
                    handleGenerate()
                  }}
                  disabled={isGenerating}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-4 pt-6">
          <div className="rounded-full bg-primary/10 p-2">
            <Wand2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">How it works</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload your portrait and describe the transformation you want. The AI will preserve your facial features
              while applying the requested changes to the background, clothing, and style. For best results, use clear
              photos with good lighting and visible facial features.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
