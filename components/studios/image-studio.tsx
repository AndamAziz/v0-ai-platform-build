"use client"

import type { Profile, Generation } from "@/lib/types"
import { useState, useRef, useEffect, useCallback, memo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sparkles,
  Loader2,
  Download,
  ZoomIn,
  Share2,
  Trash2,
  Clock,
  Zap,
  Server,
  Copy,
  ExternalLink,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  Camera,
  MoreHorizontal,
  Link,
  Star,
  Palette,
  Cpu,
  Check,
  Upload,
  Edit3,
  Wand2,
  ImageIcon,
  FolderOpen,
} from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ImageUpload } from "./image-upload"
import { ImageEditor } from "./image-editor"
import { ImageToImage } from "./image-to-image"


const CREDIT_COSTS = {
  image: 1,
}

const IMAGE_MODELS = [
  {
    id: "pollinations",
    name: "Pollinations AI",
    description: "100% Free, Unlimited, No API Key",
    badge: "Best Choice",
    badgeColor: "bg-emerald-500",
    speedColor: "text-emerald-500",
    speedBg: "bg-emerald-500/10",
    estimatedTime: "~5-10 sec",
    icon: Sparkles,
    speedLevel: 4,
    disabled: false,
    recommended: true,
  },
  {
    id: "flux",
    name: "HuggingFace FLUX",
    description: "Fast & reliable cloud AI",
    badge: "Fast",
    badgeColor: "bg-green-500",
    speedColor: "text-green-500",
    speedBg: "bg-green-500/10",
    estimatedTime: "~4 seconds",
    icon: Zap,
    speedLevel: 4,
    disabled: false,
    recommended: false,
  },
  {
    id: "freepik",
    name: "Freepik AI",
    description: "Ultra-fast generation",
    badge: "Fast",
    badgeColor: "bg-blue-500",
    speedColor: "text-blue-500",
    speedBg: "bg-blue-500/10",
    estimatedTime: "~2 seconds",
    icon: Palette,
    speedLevel: 4,
    disabled: false,
    recommended: false,
  },
  {
    id: "vps2",
    name: "VPS2 Server",
    description: "Server offline - Use Pollinations",
    badge: "Offline",
    badgeColor: "bg-gray-500",
    speedColor: "text-gray-500",
    speedBg: "bg-gray-500/10",
    estimatedTime: "~10-15 sec",
    icon: Server,
    speedLevel: 4,
    disabled: true,
    recommended: false,
  },
  {
    id: "vps",
    name: "VPS Server",
    description: "Server offline - Use Pollinations",
    badge: "Offline",
    badgeColor: "bg-gray-500",
    speedColor: "text-gray-500",
    speedBg: "bg-gray-500/10",
    estimatedTime: "~10-15 sec",
    icon: Server,
    speedLevel: 4,
    disabled: true,
    recommended: false,
  },
]

const IMAGE_SIZES = [
  { id: "512x512", name: "512×512" },
  { id: "768x768", name: "768×768" },
  { id: "1024x1024", name: "1024×1024" },
]

const IMAGE_STYLES = [
  { id: "photographic", name: "Photographic" },
  { id: "digital-art", name: "Digital Art" },
  { id: "anime", name: "Anime" },
  { id: "cinematic", name: "Cinematic" },
  { id: "fantasy-art", name: "Fantasy Art" },
  { id: "3d-model", name: "3D Model" },
]

interface ShareDropdownProps {
  url: string
  promptText?: string
  id?: string
  onShare: (platform: string, url: string, text?: string) => void
  onCopyUrl: (url: string) => void
  onNativeShare: (url: string, text?: string) => void
}

const ShareDropdown = memo(function ShareDropdown({
  url,
  promptText,
  onShare,
  onCopyUrl,
  onNativeShare,
}: ShareDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="secondary">
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onShare("twitter", url, promptText)}>
          <Twitter className="mr-2 h-4 w-4" /> Twitter / X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onShare("facebook", url, promptText)}>
          <Facebook className="mr-2 h-4 w-4" /> Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onShare("instagram", url, promptText)}>
          <Instagram className="mr-2 h-4 w-4" /> Instagram
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onShare("snapchat", url, promptText)}>
          <Camera className="mr-2 h-4 w-4" /> Snapchat
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onShare("whatsapp", url, promptText)}>
          <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onShare("linkedin", url, promptText)}>
          <Linkedin className="mr-2 h-4 w-4" /> LinkedIn
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onCopyUrl(url)}>
          <Link className="mr-2 h-4 w-4" /> Copy Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNativeShare(url, promptText)}>
          <MoreHorizontal className="mr-2 h-4 w-4" /> More Options
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

interface ImageStudioProps {
  profile: Profile | null
  generations: Generation[]
}

export function ImageStudio({ profile, generations }: ImageStudioProps) {
  const [activeTab, setActiveTab] = useState("generate")
  const [prompt, setPrompt] = useState("")
  const [model, setModel] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedImageModel") || "pollinations"
    }
    return "pollinations"
  })
  const [size, setSize] = useState("512x512")
  const [style, setStyle] = useState("photographic")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [previewImage, setPreviewImage] = useState<{ url: string; prompt?: string; id?: string } | null>(null)
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const imageGenerations = generations.filter(g => g.type === "image")

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedImageModel", model)
    }
  }, [model])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleClosePreview = useCallback(() => {
    setPreviewImage(null)
  }, [])

  const handleOpenPreview = useCallback((url: string, prompt?: string, id?: string) => {
    setPreviewImage({ url, prompt, id })
  }, [])

  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio("/sounds/notification.mp3")
      audio.volume = 0.5
      audio.play().catch(() => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2)
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.5)
      })
    } catch {
      // Ignore sound errors
    }
  }, [])

  const canGenerate = profile?.role === "admin" || (profile?.credits || 0) >= CREDIT_COSTS.image
  const selectedModel = IMAGE_MODELS.find((m) => m.id === model)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt")
      return
    }

    if (!canGenerate) {
      toast.error("Insufficient credits")
      return
    }

    setIsGenerating(true)
    setProgress(0)
    setElapsedTime(0)

    const startTime = Date.now()
    const expectedTime = model === "vps" || model === "vps2" ? 15000 : model === "freepik" ? 4000 : 10000

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      setElapsedTime(Math.floor(elapsed / 1000))
      const rawProgress = Math.min((elapsed / expectedTime) * 100, 95)
      setProgress(rawProgress)
    }, 100)

    try {
      const response = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model,
          size,
          style,
          negativePrompt,
        }),
      })

      const responseText = await response.text()

      let data: { images?: string[]; error?: string }
      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        console.error("[v0] Non-JSON response:", responseText.substring(0, 200))
        throw new Error(
          responseText.includes("Internal")
            ? "Server error. Please try again."
            : responseText.substring(0, 200) || "Unknown error",
        )
      }

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`)
      }

      if (!data.images || data.images.length === 0) {
        throw new Error("No images were generated")
      }

      setProgress(100)
      playNotificationSound()

      setGeneratedImages((prev) => [...data.images!, ...prev])
      toast.success("Image generated successfully!")
      router.refresh()
    } catch (error) {
      console.error("[v0] Generation error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate image")
    } finally {
      if (timerRef.current) clearInterval(timerRef.current)
      setIsGenerating(false)
      setProgress(0)
      setElapsedTime(0)
    }
  }

  const handleDownload = useCallback(async (url: string, index: number) => {
    try {
      // Use proxy for external URLs to avoid CORS issues
      const proxyUrl = url.includes("image.pluschannel.co.uk") 
        ? `/api/proxy?url=${encodeURIComponent(url)}`
        : url
      const response = await fetch(proxyUrl)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = `ai-image-${Date.now()}-${index}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)
      toast.success("Image downloaded!")
    } catch {
      // Fallback: open in new tab for manual download
      window.open(url, "_blank")
      toast.info("Opening image in new tab - right click to save")
    }
  }, [])

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      const response = await fetch("/api/image/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete image")
      }

      toast.success("Image deleted!")
      setDeleteImageId(null)
      setPreviewImage(null)
      router.refresh()
    } catch {
      toast.error("Failed to delete image")
    } finally {
      setIsDeleting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const handleShare = useCallback(
    (platform: string, url: string, text?: string) => {
      const shareText = text ? `Check out this AI-generated image: "${text}"` : "Check out this AI-generated image!"
      const encodedUrl = encodeURIComponent(url)
      const encodedText = encodeURIComponent(shareText)

      switch (platform) {
        case "twitter":
          window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, "_blank")
          break
        case "facebook":
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank")
          break
        case "instagram":
          handleDownload(url, 0)
          toast.info("Image downloaded! Open Instagram to share.")
          break
        case "snapchat":
          handleDownload(url, 0)
          toast.info("Image downloaded! Open Snapchat to share.")
          break
        case "whatsapp":
          window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, "_blank")
          break
        case "linkedin":
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, "_blank")
          break
      }
    },
    [handleDownload],
  )

  const handleCopyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard!")
    } catch {
      toast.error("Failed to copy link")
    }
  }, [])

  const handleNativeShare = useCallback(
    async (url: string, text?: string) => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: "AI Generated Image",
            text: text || "Check out this AI-generated image!",
            url: url,
          })
        } catch (error) {
          if ((error as Error).name !== "AbortError") {
            toast.error("Failed to share")
          }
        }
      } else {
        handleCopyUrl(url)
      }
    },
    [handleCopyUrl],
  )

  const handleOpenInNewTab = useCallback((url: string) => {
    window.open(url, "_blank")
  }, [])

  const handleCopyPrompt = useCallback(async (promptText: string) => {
    try {
      await navigator.clipboard.writeText(promptText)
      toast.success("Prompt copied!")
    } catch {
      toast.error("Failed to copy prompt")
    }
  }, [])

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="generate" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Generate</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload</span>
          </TabsTrigger>
          <TabsTrigger value="edit" className="gap-2">
            <Edit3 className="h-4 w-4" />
            <span className="hidden sm:inline">Edit</span>
          </TabsTrigger>
          <TabsTrigger value="img2img" className="gap-2">
            <Wand2 className="h-4 w-4" />
            <span className="hidden sm:inline">Img2Img</span>
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Library</span>
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Generate Image</CardTitle>
                  {selectedModel && (
                    <span
                      className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-white ${selectedModel.badgeColor}`}
                    >
                      {selectedModel.icon && <selectedModel.icon className="h-3 w-3" />}
                      {selectedModel.badge}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="prompt">Prompt</Label>
                    {prompt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyPrompt(prompt)}
                        className="h-6 px-2 text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    )}
                  </div>
                  <Textarea
                    id="prompt"
                    placeholder="A serene mountain landscape at sunset with a clear lake reflecting the sky..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>AI Model</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between h-auto py-3 px-4 bg-transparent"
                      >
                        <div className="flex items-center gap-3">
                          {selectedModel && (
                            <>
                              <div className={`rounded-lg p-2 ${selectedModel.speedBg}`}>
                                <selectedModel.icon className={`h-4 w-4 ${selectedModel.speedColor}`} />
                              </div>
                              <div className="text-left">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{selectedModel.name}</span>
                                  {selectedModel.recommended && (
                                    <Star className="h-3.5 w-3.5 text-green-500 fill-green-500" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${selectedModel.badgeColor}`}>
                                    {selectedModel.badge}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {selectedModel.estimatedTime}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4 opacity-50"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] p-2">
                      {IMAGE_MODELS.map((m, index) => (
                        <div key={m.id}>
                          {index > 0 && <DropdownMenuSeparator className="my-1" />}
                          <DropdownMenuItem
                            onClick={() => !m.disabled && setModel(m.id)}
                            disabled={m.disabled}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                              model === m.id
                                ? "bg-primary/10 border border-primary/30"
                                : m.recommended
                                  ? "bg-green-500/5 hover:bg-green-500/10"
                                  : ""
                            }`}
                          >
                            <div className={`rounded-lg p-2 ${m.speedBg}`}>
                              <m.icon className={`h-4 w-4 ${m.speedColor}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{m.name}</span>
                                {m.recommended && (
                                  <Star className="h-3.5 w-3.5 text-green-500 fill-green-500" />
                                )}
                                {model === m.id && (
                                  <Check className="h-4 w-4 text-primary ml-auto" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{m.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${m.badgeColor}`}>
                                  {m.badge}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {m.estimatedTime}
                                </span>
                              </div>
                            </div>
                          </DropdownMenuItem>
                        </div>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {selectedModel?.warning && (
                    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2">
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">{selectedModel.warning}</p>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="size">Size</Label>
                    <Select value={size} onValueChange={setSize}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {IMAGE_SIZES.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="style">Style</Label>
                    <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        {IMAGE_STYLES.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="negative">Negative Prompt (optional)</Label>
                  <Input
                    id="negative"
                    placeholder="blurry, low quality, distorted..."
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                  <span className="text-sm text-muted-foreground">Cost: {CREDIT_COSTS.image} credits</span>
                  <span className="text-sm font-medium">
                    Balance: {profile?.role === "admin" ? "Unlimited" : profile?.credits || 0}
                  </span>
                </div>

                <Button className="w-full" onClick={handleGenerate} disabled={isGenerating || !canGenerate}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {model === "vps"
                        ? "Generating (~10-15 min)..."
                        : model === "vps2"
                          ? "Generating (~3 min)..."
                          : model === "freepik"
                            ? "Generating (~2 sec)..."
                            : "Generating..."}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Image
                    </>
                  )}
                </Button>

                {isGenerating && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{progress < 95 ? "Processing..." : "Almost done..."}</span>
                      <span className="font-mono text-muted-foreground">{formatTime(elapsedTime)}</span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="absolute inset-y-0 left-0 bg-primary transition-all duration-300 ease-out rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Generated */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Generations</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {generatedImages.length + imageGenerations.filter(g => g.result_url).length} images
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {generatedImages.length === 0 && imageGenerations.filter(g => g.result_url).length === 0 ? (
                  <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
                    <div className="text-center">
                      <ImageIcon className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">Your generated images will appear here</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {generatedImages.map((url, index) => (
                      <div
                        key={`new-${index}`}
                        className="group relative overflow-hidden rounded-lg border border-border bg-card"
                      >
                        <div className="absolute top-2 left-2 z-10">
                          <span className="rounded-full bg-green-500/90 px-2 py-0.5 text-xs text-white">New</span>
                        </div>
                        <img
                          src={url || "/placeholder.svg"}
                          alt={`Generated ${index}`}
                          className="aspect-square w-full object-cover cursor-pointer transition-transform hover:scale-105"
                          onClick={() => handleOpenPreview(url, prompt)}
                        />
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button size="sm" variant="secondary" onClick={() => handleOpenPreview(url, prompt)}>
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => handleDownload(url, index)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <ShareDropdown
                            url={url}
                            promptText={prompt}
                            onShare={handleShare}
                            onCopyUrl={handleCopyUrl}
                            onNativeShare={handleNativeShare}
                          />
                        </div>
                      </div>
                    ))}
                    {imageGenerations
                      .filter((g) => g.result_url)
                      .slice(0, 4)
                      .map((gen) => (
                        <div
                          key={gen.id}
                          className="group relative overflow-hidden rounded-lg border border-border bg-card"
                        >
                          <img
                            src={gen.result_url! || "/placeholder.svg"}
                            alt={gen.prompt || "Generated image"}
                            className="aspect-square w-full object-cover cursor-pointer transition-transform hover:scale-105"
                            onClick={() => handleOpenPreview(gen.result_url!, gen.prompt || undefined, gen.id)}
                          />
                          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleOpenPreview(gen.result_url!, gen.prompt || undefined, gen.id)}
                            >
                              <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => handleDownload(gen.result_url!, 0)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <ShareDropdown
                              url={gen.result_url!}
                              promptText={gen.prompt || undefined}
                              id={gen.id}
                              onShare={handleShare}
                              onCopyUrl={handleCopyUrl}
                              onNativeShare={handleNativeShare}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <ImageUpload onUploadComplete={() => router.refresh()} />
        </TabsContent>

        {/* Edit Tab */}
        <TabsContent value="edit">
          <ImageEditor generations={imageGenerations} />
        </TabsContent>

        {/* Image to Image Tab */}
        <TabsContent value="img2img">
          <ImageToImage profile={profile} generations={imageGenerations} />
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Image Library
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  {imageGenerations.filter(g => g.result_url).length} total images
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {imageGenerations.filter(g => g.result_url).length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
                  <div className="text-center">
                    <FolderOpen className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No images in your library yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Generate or upload images to get started</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {imageGenerations
                    .filter((g) => g.result_url)
                    .map((gen) => (
                      <div
                        key={gen.id}
                        className="group relative overflow-hidden rounded-lg border border-border bg-card"
                      >
                        <img
                          src={gen.result_url! || "/placeholder.svg"}
                          alt={gen.prompt || "Image"}
                          className="aspect-square w-full object-cover cursor-pointer transition-transform hover:scale-105"
                          onClick={() => handleOpenPreview(gen.result_url!, gen.prompt || undefined, gen.id)}
                        />
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenPreview(gen.result_url!, gen.prompt || undefined, gen.id)}
                          >
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => handleDownload(gen.result_url!, 0)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <ShareDropdown
                            url={gen.result_url!}
                            promptText={gen.prompt || undefined}
                            id={gen.id}
                            onShare={handleShare}
                            onCopyUrl={handleCopyUrl}
                            onNativeShare={handleNativeShare}
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => setDeleteImageId(gen.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {/* Provider badge */}
                        <div className="absolute top-2 left-2">
                          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                            {gen.provider || "AI"}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewImage}
        onOpenChange={(open) => {
          if (!open) handleClosePreview()
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="space-y-4">
              <img
                src={previewImage.url || "/placeholder.svg"}
                alt="Preview"
                className="w-full rounded-lg object-contain max-h-[70vh]"
              />
              {previewImage.prompt && (
                <div className="flex items-start gap-2">
                  <p className="text-sm text-muted-foreground italic flex-1">"{previewImage.prompt}"</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyPrompt(previewImage.prompt!)}
                    className="shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => handleDownload(previewImage.url, 0)}>
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
                <Button variant="outline" onClick={() => handleCopyUrl(previewImage.url)}>
                  <Copy className="mr-2 h-4 w-4" /> Copy URL
                </Button>
                <Button variant="outline" onClick={() => handleOpenInNewTab(previewImage.url)}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Open
                </Button>
                <ShareDropdown
                  url={previewImage.url}
                  promptText={previewImage.prompt}
                  id={previewImage.id}
                  onShare={handleShare}
                  onCopyUrl={handleCopyUrl}
                  onNativeShare={handleNativeShare}
                />
                {previewImage.id && (
                  <Button
                    variant="outline"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 bg-transparent"
                    onClick={() => setDeleteImageId(previewImage.id!)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteImageId}
        onOpenChange={(open) => {
          if (!open) setDeleteImageId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteImageId && handleDelete(deleteImageId)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
