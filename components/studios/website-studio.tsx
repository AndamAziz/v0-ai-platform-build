"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import type { Profile, Generation } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Loader2,
  Sparkles,
  Eye,
  Download,
  Copy,
  Smartphone,
  Monitor,
  Tablet,
  ExternalLink,
  Check,
  Globe,
  Trash2,
  Grid3X3,
  Plus,
  Wand2,
  ChevronLeft,
  Maximize2,
  RefreshCw,
  Volume2,
  VolumeX,
  Brain,
  CheckSquare,
  X,
  CheckCircle2,
} from "lucide-react"
import { CREDIT_COSTS } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface WebsiteStudioProps {
  profile: Profile | null
  generations: Generation[]
}

interface SavedWebsite {
  id: string
  prompt: string
  code: string
  createdAt: string
}

const LOADING_MESSAGES = [
  "Analyzing your description...",
  "Detecting topic & style...",
  "Finding perfect images...",
  "Designing layout...",
  "Creating sections...",
  "Adding interactions...",
  "Polishing design...",
  "Almost ready...",
]

type Viewport = "mobile" | "tablet" | "desktop"
type View = "create" | "gallery" | "preview"

function createSafeHtml(code: string): string {
  if (!code) return ""
  try {
    const sanitizedCode = code.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Generated Website</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Tajawal:wght@400;500;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'Inter','Tajawal','Noto Sans Arabic',system-ui,-apple-system,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto;display:block}
</style>
</head>
<body>
${sanitizedCode}
</body>
</html>`
  } catch {
    return ""
  }
}

function WebsiteThumbnail({ code, className }: { code: string; className?: string }) {
  const [loaded, setLoaded] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (iframeRef.current && code) {
      const html = createSafeHtml(code)
      const blob = new Blob([html], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      iframeRef.current.src = url
      return () => URL.revokeObjectURL(url)
    }
  }, [code])

  return (
    <div
      className={cn("relative w-full h-full overflow-hidden bg-zinc-950 border border-zinc-800 rounded-lg", className)}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none border-0"
        onLoad={() => setLoaded(true)}
        sandbox="allow-same-origin"
        title="Website Preview"
      />
    </div>
  )
}

const AI_PROVIDERS = [
  { id: "auto", name: "Auto Select (Best Available)", description: "AI chooses the best provider" },
  { id: "gemini", name: "Google Gemini Pro", description: "Fast & high quality" },
  { id: "groq", name: "Groq Llama", description: "Ultra fast responses" },
  { id: "openrouter", name: "OpenRouter Claude", description: "Most creative" },
]

export function WebsiteStudio({ profile, generations }: WebsiteStudioProps) {
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [viewport, setViewport] = useState<Viewport>("desktop")
  const [copied, setCopied] = useState(false)
  const [currentView, setCurrentView] = useState<View>("create")
  const [savedWebsites, setSavedWebsites] = useState<SavedWebsite[]>([])
  const [deleteWebsite, setDeleteWebsite] = useState<SavedWebsite | null>(null)
  const [previewWebsite, setPreviewWebsite] = useState<SavedWebsite | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [aiProvider, setAiProvider] = useState("auto")
  const router = useRouter()

  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const audioContextRef = useRef<AudioContext | null>(null)
  
  // Multi-select state for gallery
  const [selectMode, setSelectMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showDeleteMultipleDialog, setShowDeleteMultipleDialog] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!mounted) return
    try {
      const saved = localStorage.getItem("saved-websites")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setSavedWebsites(parsed)
        }
      }
    } catch {
      // Ignore errors
    }
  }, [mounted])

  const playSound = useCallback(
    (type: "tick" | "success" | "error") => {
      if (!soundEnabled) return
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        }
        const ctx = audioContextRef.current
        if (type === "tick") {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime)
          osc.type = "sine"
          gain.gain.setValueAtTime(0.05, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
          osc.start(ctx.currentTime)
          osc.stop(ctx.currentTime + 0.05)
        } else if (type === "success") {
          const notes = [523.25, 659.25, 783.99, 1046.5]
          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.value = freq
            osc.type = "sine"
            gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.12)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4)
            osc.start(ctx.currentTime + i * 0.12)
            osc.stop(ctx.currentTime + i * 0.12 + 0.4)
          })
        } else if (type === "error") {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.setValueAtTime(200, ctx.currentTime)
          osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3)
          osc.type = "sawtooth"
          gain.gain.setValueAtTime(0.1, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
          osc.start(ctx.currentTime)
          osc.stop(ctx.currentTime + 0.3)
        }
      } catch {
        // Ignore audio errors
      }
    },
    [soundEnabled],
  )

  const saveWebsites = useCallback((websites: SavedWebsite[]) => {
    try {
      localStorage.setItem("saved-websites", JSON.stringify(websites))
      setSavedWebsites(websites)
    } catch {
      toast.error("Failed to save")
    }
  }, [])

  const totalCost = CREDIT_COSTS.website
  const canGenerate = profile?.role === "admin" || (profile?.credits || 0) >= totalCost

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please describe your website")
      return
    }

    if (!canGenerate) {
      toast.error("Insufficient credits")
      return
    }

    setIsGenerating(true)
    setLoadingProgress(0)
    setLoadingMessageIndex(0)

    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        const newProgress = Math.min(prev + Math.random() * 6 + 2, 92)
        const newMessageIndex = Math.min(Math.floor(newProgress / 12), LOADING_MESSAGES.length - 1)
        if (newMessageIndex !== loadingMessageIndex) {
          setLoadingMessageIndex(newMessageIndex)
          playSound("tick")
        }
        return newProgress
      })
    }, 500)

    try {
      const response = await fetch("/api/website/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          provider: aiProvider !== "auto" ? aiProvider : undefined,
        }),
      })

      clearInterval(progressInterval)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate")
      }

      if (!data.code) {
        throw new Error("No code returned")
      }

      setLoadingProgress(100)
      playSound("success")

      const newWebsite: SavedWebsite = {
        id: `web_${Date.now()}`,
        prompt: prompt,
        code: data.code,
        createdAt: new Date().toISOString(),
      }

      const updatedWebsites = [newWebsite, ...savedWebsites]
      saveWebsites(updatedWebsites)

      setTimeout(() => {
        setPreviewWebsite(newWebsite)
        setPreviewKey((prev) => prev + 1)
        setCurrentView("preview")
        toast.success("Website generated!")
        router.refresh()
      }, 600)
    } catch (error) {
      clearInterval(progressInterval)
      playSound("error")
      toast.error(error instanceof Error ? error.message : "Generation failed")
    } finally {
      setTimeout(() => {
        setIsGenerating(false)
        setLoadingProgress(0)
      }, 700)
    }
  }

  const handleRegenerate = () => {
    if (previewWebsite) {
      setPrompt(previewWebsite.prompt)
      setCurrentView("create")
      setTimeout(() => handleGenerate(), 500)
    }
  }

  const handleCopy = async (code: string) => {
    try {
      const fullHtml = createSafeHtml(code)
      await navigator.clipboard.writeText(fullHtml)
      setCopied(true)
      toast.success("Copied!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  const handleDownload = (website: SavedWebsite) => {
    try {
      const html = createSafeHtml(website.code)
      const blob = new Blob([html], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `website-${website.id}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Downloaded!")
    } catch {
      toast.error("Failed to download")
    }
  }

  const handleOpenNewTab = (code: string) => {
    try {
      const html = createSafeHtml(code)
      const blob = new Blob([html], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
    } catch {
      toast.error("Failed to open")
    }
  }

  const handleDeleteWebsite = (website: SavedWebsite) => {
    const updated = savedWebsites.filter((w) => w.id !== website.id)
    saveWebsites(updated)
    setDeleteWebsite(null)
    toast.success("Deleted")
  }

  // Toggle item selection
  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Select all items
  const selectAll = () => {
    const allIds = savedWebsites.map(w => w.id)
    setSelectedItems(new Set(allIds))
  }

  // Deselect all
  const deselectAll = () => {
    setSelectedItems(new Set())
  }

  // Exit select mode
  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedItems(new Set())
  }

  // Delete multiple items
  const handleDeleteMultiple = () => {
    if (selectedItems.size === 0) return
    const updated = savedWebsites.filter(w => !selectedItems.has(w.id))
    saveWebsites(updated)
    toast.success(`${selectedItems.size} website(s) deleted`)
    exitSelectMode()
    setShowDeleteMultipleDialog(false)
  }

  const getViewportWidth = () => {
    switch (viewport) {
      case "mobile":
        return "375px"
      case "tablet":
        return "768px"
      case "desktop":
        return "100%"
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  // Loading screen
  if (isGenerating) {
    const displayMessage = LOADING_MESSAGES[loadingMessageIndex]

    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-zinc-950 via-violet-950/20 to-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 mb-8">
            <div
              className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-spin"
              style={{ animationDuration: "8s" }}
            />
            <div
              className="absolute inset-3 rounded-full border-2 border-fuchsia-500/40 animate-spin"
              style={{ animationDuration: "6s", animationDirection: "reverse" }}
            />
            <div
              className="absolute inset-6 rounded-full border-2 border-violet-400/50 animate-spin"
              style={{ animationDuration: "4s" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-14 w-14 sm:h-18 sm:w-18 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-violet-500/50">
                <Brain className="h-7 w-7 sm:h-9 sm:w-9 text-white animate-pulse" />
              </div>
            </div>
          </div>

          <div className="w-64 sm:w-80 mb-6">
            <div className="flex justify-between text-xs text-zinc-400 mb-2">
              <span>{displayMessage}</span>
              <span>{Math.round(loadingProgress)}%</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          </div>

          <p className="text-zinc-500 text-sm text-center max-w-md">
            AI is analyzing your description and creating a unique website...
          </p>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="mt-6 text-zinc-500 hover:text-zinc-300"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
            {soundEnabled ? "Sound On" : "Sound Off"}
          </Button>
        </div>
      </div>
    )
  }

  // Preview view
  if (currentView === "preview" && previewWebsite) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setCurrentView("create")} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="hidden sm:block h-6 w-px bg-zinc-700" />
            <span className="hidden sm:block text-sm text-zinc-400 truncate max-w-[200px]">
              {previewWebsite.prompt}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport switcher */}
            <div className="hidden sm:flex items-center bg-zinc-800/50 rounded-lg p-1">
              {[
                { id: "mobile" as Viewport, icon: Smartphone, label: "Mobile" },
                { id: "tablet" as Viewport, icon: Tablet, label: "Tablet" },
                { id: "desktop" as Viewport, icon: Monitor, label: "Desktop" },
              ].map((v) => (
                <Button
                  key={v.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewport(v.id)}
                  className={cn("h-8 w-8 p-0", viewport === v.id && "bg-violet-600 text-white")}
                  title={v.label}
                >
                  <v.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>

            <Button variant="ghost" size="sm" onClick={handleRegenerate} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Regenerate</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={() => handleCopy(previewWebsite.code)} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={() => handleDownload(previewWebsite)} className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={() => handleOpenNewTab(previewWebsite.code)} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Open</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} className="gap-2">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview iframe */}
        <div className="flex-1 bg-zinc-950 flex items-start justify-center p-4 overflow-auto">
          <div
            className={cn(
              "bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300",
              isFullscreen ? "fixed inset-4 z-50" : "h-full",
            )}
            style={{ width: isFullscreen ? "auto" : getViewportWidth() }}
          >
            <iframe
              key={previewKey}
              srcDoc={createSafeHtml(previewWebsite.code)}
              className="w-full h-full border-0"
              title="Website Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      </div>
    )
  }

  // Gallery view
  if (currentView === "gallery") {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setCurrentView("create"); exitSelectMode(); }} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <h2 className="text-xl font-semibold">My Websites ({savedWebsites.length})</h2>
          </div>
          
          {/* Multi-select controls */}
          <div className="flex flex-wrap items-center gap-2">
            {!selectMode ? (
              savedWebsites.length > 0 && (
                <Button variant="default" size="sm" onClick={() => setSelectMode(true)}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Select
                </Button>
              )
            ) : (
              <>
                <span className="text-sm text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
                  {selectedItems.size} selected
                </span>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  disabled={selectedItems.size === 0}
                  onClick={() => setShowDeleteMultipleDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedItems.size})
                </Button>
                <Button variant="ghost" size="sm" onClick={exitSelectMode}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {savedWebsites.length === 0 ? (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Globe className="h-12 w-12 text-zinc-600 mb-4" />
              <p className="text-zinc-400 mb-4">No websites yet</p>
              <Button onClick={() => setCurrentView("create")} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Website
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedWebsites.map((website) => (
              <Card
                key={website.id}
                className={cn(
                  "group bg-zinc-900/50 border-zinc-800 hover:border-violet-500/50 transition-all overflow-hidden cursor-pointer",
                  selectMode && selectedItems.has(website.id) && "ring-2 ring-violet-500 bg-violet-500/10"
                )}
                onClick={() => {
                  if (selectMode) {
                    toggleItemSelection(website.id)
                  } else {
                    setPreviewWebsite(website)
                    setPreviewKey((prev) => prev + 1)
                    setCurrentView("preview")
                  }
                }}
              >
                {/* Thumbnail preview */}
                <div className="relative h-40 overflow-hidden">
                  {/* Selection checkbox */}
                  {selectMode && (
                    <div 
                      className="absolute top-2 right-2 z-10"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleItemSelection(website.id)
                      }}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                        selectedItems.has(website.id) 
                          ? "bg-violet-500 text-white" 
                          : "bg-black/50 text-white hover:bg-black/70"
                      )}>
                        {selectedItems.has(website.id) ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-white" />
                        )}
                      </div>
                    </div>
                  )}
                  <WebsiteThumbnail code={website.code} className="h-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-2 left-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs bg-violet-600 hover:bg-violet-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPreviewWebsite(website)
                        setPreviewKey((prev) => prev + 1)
                        setCurrentView("preview")
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenNewTab(website.code)
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-3">
                  <p className="text-sm text-zinc-300 line-clamp-2 mb-2">{website.prompt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{new Date(website.createdAt).toLocaleDateString()}</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:text-violet-400"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopy(website.code)
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:text-violet-400"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(website)
                        }}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteWebsite(website)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete confirmation - Single */}
        <AlertDialog open={!!deleteWebsite} onOpenChange={() => setDeleteWebsite(null)}>
          <AlertDialogContent className="bg-zinc-900 border-zinc-800">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Website?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => deleteWebsite && handleDeleteWebsite(deleteWebsite)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete confirmation - Multiple */}
        <AlertDialog open={showDeleteMultipleDialog} onOpenChange={setShowDeleteMultipleDialog}>
          <AlertDialogContent className="bg-zinc-900 border-zinc-800">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedItems.size} Website(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete {selectedItems.size} selected website(s).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDeleteMultiple}
              >
                Delete {selectedItems.size} website(s)
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // Create view - Simplified UI with AI Provider dropdown
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-violet-500" />
            AI Website Builder
          </h1>
          <p className="text-zinc-900 text-sm mt-1">
            Describe your website - AI will automatically detect style, colors, and create perfect images
          </p>
        </div>
        {savedWebsites.length > 0 && (
          <Button variant="outline" onClick={() => setCurrentView("gallery")} className="gap-2">
            <Grid3X3 className="h-4 w-4" />
            My Websites ({savedWebsites.length})
          </Button>
        )}
      </div>

      {/* Main form */}
      <Card className="bg-white border-zinc-200 shadow-sm">
        <CardContent className="p-6 space-y-6">
          {/* Prompt */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2 text-zinc-900">
              <Brain className="h-4 w-4 text-violet-500" />
              Describe Your Website
            </Label>
            <Textarea
              placeholder="Example: Luxury car dealership website with black and gold theme, showing Ferrari, Lamborghini, Porsche with prices, hero section with sports car, contact form..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[160px] bg-white border-zinc-300 focus:border-violet-500 resize-none text-base text-zinc-900 placeholder:text-zinc-400"
            />
            <p className="text-xs text-zinc-500">
              Be specific about: topic, colors, sections, images you want. AI will handle everything else automatically.
            </p>
          </div>

          {/* AI Provider dropdown */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2 text-zinc-900">
              <Sparkles className="h-4 w-4 text-fuchsia-500" />
              AI Provider
            </Label>
            <Select value={aiProvider} onValueChange={setAiProvider}>
              <SelectTrigger className="bg-white border-zinc-300 text-zinc-900">
                <SelectValue placeholder="Select AI Provider" />
              </SelectTrigger>
              <SelectContent className="bg-white border-zinc-200">
                {AI_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id} className="focus:bg-violet-50 text-zinc-900">
                    <div className="flex flex-col">
                      <span>{provider.name}</span>
                      <span className="text-xs text-zinc-500">{provider.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generate button */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4 text-sm text-zinc-600">
              <span className="flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Cost: {totalCost} credits
              </span>
              <span>Time: ~20-40s</span>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || !canGenerate}
              className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 px-8"
            >
              <Sparkles className="h-4 w-4" />
              Generate Website
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Credits warning */}
      {!canGenerate && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <p className="text-amber-700 text-sm">
              You need {totalCost} credits to generate a website. Current balance: {profile?.credits || 0}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
