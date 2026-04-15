"use client"

import { useState, useRef, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent } from "@/components/ui/dialog"
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
  ImageIcon,
  VideoIcon,
  MicIcon,
  Trash2,
  Share2,
  Download,
  Twitter,
  Facebook,
  Linkedin,
  Instagram,
  MessageCircle,
  LinkIcon,
  Play,
  Pause,
  Ghost,
  Search,
  Grid3X3,
  LayoutGrid,
  X,
  Loader2,
  CheckSquare,
  Square,
  CheckCircle2,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Generation {
  id: string
  type: string
  prompt: string
  result_url: string
  provider: string
  credits_used: number
  created_at: string
  status: string
}

interface GalleryViewProps {
  generations: Generation[]
  type: string
  isAdmin: boolean
}

export function GalleryView({ generations, type, isAdmin }: GalleryViewProps) {
  const router = useRouter()
  const [selectedItem, setSelectedItem] = useState<Generation | null>(null)
  const [deleteItem, setDeleteItem] = useState<Generation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [gridSize, setGridSize] = useState<"small" | "large">("large")
  const [isSharing, setIsSharing] = useState(false)
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({})
  
  // Multi-select state
  const [selectMode, setSelectMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false)
  const [showDeleteMultipleDialog, setShowDeleteMultipleDialog] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null) // Track which item is being deleted

  const handleCloseDialog = useCallback(() => {
    setSelectedItem(null)
  }, [])

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
    const allIds = filteredGenerations.map(g => g.id)
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

  // Delete multiple items - process sequentially to avoid abort errors
  const handleDeleteMultiple = async () => {
    if (selectedItems.size === 0) return
    setIsDeletingMultiple(true)

    let successCount = 0
    let failCount = 0
    const itemsToDelete = Array.from(selectedItems)

    try {
      // Process deletions sequentially (one by one) to avoid request abortion
      for (const id of itemsToDelete) {
        setDeletingItemId(id) // Track which item is being deleted
        try {
          const response = await fetch("/api/image/delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })
          
          if (response.ok) {
            successCount++
            // Remove from selected items as we go
            setSelectedItems(prev => {
              const newSet = new Set(prev)
              newSet.delete(id)
              return newSet
            })
          } else {
            failCount++
          }
        } catch (err) {
          failCount++
        }
      }
      setDeletingItemId(null)

      if (successCount > 0) {
        toast.success(`${successCount} item(s) deleted successfully`)
      }
      if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} item(s)`)
      }
      
      router.refresh()
      exitSelectMode()
      setShowDeleteMultipleDialog(false)
    } catch (error) {
      toast.error("Failed to delete items")
    } finally {
      setIsDeletingMultiple(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setIsDeleting(true)

    try {
      const response = await fetch("/api/image/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteItem.id }),
      })

      if (!response.ok) throw new Error("Failed to delete")

      toast.success("Deleted successfully")
      router.refresh()
      setDeleteItem(null)
      setSelectedItem(null)
    } catch (error) {
      toast.error("Failed to delete")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDownload = async (url: string, filename: string) => {
    try {
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.target = "_blank"
      a.rel = "noopener noreferrer"

      // For Supabase URLs, add download parameter
      if (url.includes("supabase.co")) {
        a.href = url + (url.includes("?") ? "&" : "?") + "download=" + filename
      }

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success("Download started!")
    } catch (error) {
      // Fallback: open in new tab
      window.open(url, "_blank")
      toast.info("Opening in new tab - right-click to save")
    }
  }

  const handleShare = async (platform: string, url: string, prompt: string, itemType: string) => {
    const text = `Check out this AI-generated ${itemType}: ${prompt?.slice(0, 100) || "content"}...`
    const encodedUrl = encodeURIComponent(url)
    const encodedText = encodeURIComponent(text)

    if (platform === "native") {
      try {
        setIsSharing(true)
        if (navigator.share) {
          await navigator.share({
            title: `AI Generated ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`,
            text: text,
            url: url,
          })
          toast.success("Shared successfully!")
        } else {
          navigator.clipboard.writeText(url)
          toast.success("Link copied to clipboard!")
        }
      } catch (error: any) {
        if (error.name !== "AbortError") {
          navigator.clipboard.writeText(url)
          toast.success("Link copied to clipboard!")
        }
      } finally {
        setIsSharing(false)
      }
      return
    }

    if (platform === "instagram" || platform === "snapchat" || platform === "whatsapp-direct") {
      // Open download in new tab
      window.open(url, "_blank")
      toast.success(
        `Opening ${itemType}. Save it and share to ${platform === "instagram" ? "Instagram" : platform === "snapchat" ? "Snapchat" : "WhatsApp"}!`,
      )
      return
    }

    // For WhatsApp with link
    if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, "_blank", "width=600,height=400")
      return
    }

    // Copy link
    if (platform === "copy") {
      navigator.clipboard.writeText(url)
      toast.success("Link copied!")
      return
    }

    // Social media share URLs
    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    }

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], "_blank", "width=600,height=400")
    }
  }

  const playAudio = (url: string) => {
    if (playingAudio === url && audioElement) {
      audioElement.pause()
      setPlayingAudio(null)
      setAudioElement(null)
      return
    }

    if (audioElement) {
      audioElement.pause()
    }

    const audio = new Audio(url)
    audio.play()
    audio.onended = () => {
      setPlayingAudio(null)
      setAudioElement(null)
    }
    setPlayingAudio(url)
    setAudioElement(audio)
  }

  // Filter only media with valid URLs
  const mediaGenerations = generations.filter(
    (g) =>
      g.result_url && g.result_url.trim() !== "" && (g.type === "image" || g.type === "video" || g.type === "voice"),
  )

  // Filter by selected type
  const filteredByType = type === "all" ? mediaGenerations : mediaGenerations.filter((g) => g.type === type)

  // Filter by search query
  const filteredGenerations = searchQuery
    ? filteredByType.filter((g) => g.prompt?.toLowerCase().includes(searchQuery.toLowerCase()))
    : filteredByType

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getTypeLabel = () => {
    if (type === "image") return "Images"
    if (type === "video") return "Videos"
    if (type === "voice") return "Voice Files"
    return "All Content"
  }

  return (
    <div className="space-y-4">
      {/* Search and Grid Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{getTypeLabel()}</h2>
          <Badge variant="secondary">{filteredGenerations.length}</Badge>
        </div>

        <div className="flex items-center gap-2">
          {!selectMode ? (
            <>
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by prompt..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-[250px]"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => setGridSize(gridSize === "small" ? "large" : "small")}>
                {gridSize === "small" ? <LayoutGrid className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
              {filteredGenerations.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setSelectMode(true)}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Select
                </Button>
              )}
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">
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

      {/* Gallery Grid */}
      {filteredGenerations.length === 0 ? (
        <Card className="border-dashed">
          <div className="flex flex-col items-center justify-center py-16">
            {type === "image" && <ImageIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />}
            {type === "video" && <VideoIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />}
            {type === "voice" && <MicIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />}
            {type === "all" && <Grid3X3 className="h-16 w-16 text-muted-foreground/50 mb-4" />}
            <h3 className="text-lg font-medium mb-2">No {type === "all" ? "content" : type + "s"} yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery ? "No results found for your search" : "Start creating to see your content here"}
            </p>
          </div>
        </Card>
      ) : (
        <div
          className={cn(
            "grid gap-4",
            gridSize === "small"
              ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
          )}
        >
          {filteredGenerations.map((item) => (
            <Card
              key={item.id}
              className={cn(
                "group relative overflow-hidden cursor-pointer transition-all duration-300",
                "hover:ring-2 hover:ring-primary/50 hover:shadow-lg",
                hoveredItem === item.id && "ring-2 ring-primary",
                selectMode && selectedItems.has(item.id) && "ring-2 ring-primary bg-primary/5",
              )}
              onMouseEnter={() => {
                setHoveredItem(item.id)
                if (item.type === "video" && videoRefs.current[item.id]) {
                  videoRefs.current[item.id]?.play().catch(() => {})
                }
              }}
              onMouseLeave={() => {
                setHoveredItem(null)
                if (item.type === "video" && videoRefs.current[item.id]) {
                  videoRefs.current[item.id]?.pause()
                  if (videoRefs.current[item.id]) {
                    videoRefs.current[item.id]!.currentTime = 0
                  }
                }
              }}
              onClick={() => {
                if (selectMode) {
                  toggleItemSelection(item.id)
                } else {
                  setSelectedItem(item)
                }
              }}
            >
              <div className={cn("relative bg-muted", gridSize === "small" ? "aspect-square" : "aspect-video")}>
                {/* Image */}
                {item.type === "image" && item.result_url && (
                  <Image
                    src={item.result_url || "/placeholder.svg"}
                    alt={item.prompt || "Generated image"}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}

                {/* Video */}
                {item.type === "video" && item.result_url && (
                  <>
                    <video
                      ref={(el) => {
                        videoRefs.current[item.id] = el
                      }}
                      src={item.result_url}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
                    <div
                      className={cn(
                        "absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity",
                        hoveredItem === item.id ? "opacity-0" : "opacity-100",
                      )}
                    >
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <Play className="h-6 w-6 text-foreground ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                  </>
                )}

                {/* Voice */}
                {item.type === "voice" && (
                  <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-green-500/20 to-green-600/5">
                    <div
                      className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center transition-all",
                        playingAudio === item.result_url
                          ? "bg-green-500 text-white animate-pulse"
                          : "bg-green-500/20 text-green-500",
                      )}
                    >
                      {playingAudio === item.result_url ? (
                        <Pause className="h-8 w-8" />
                      ) : (
                        <Play className="h-8 w-8 ml-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Click to play</p>
                  </div>
                )}

                {/* Loading overlay when this item is being deleted */}
                {deletingItemId === item.id && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
                    <span className="text-white text-sm font-medium">
                      Deleting {item.type}...
                    </span>
                  </div>
                )}

                {/* Selection checkbox in select mode */}
                {selectMode && (
                  <div 
                    className="absolute top-2 right-2 z-10"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleItemSelection(item.id)
                    }}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                      selectedItems.has(item.id) 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-black/50 text-white hover:bg-black/70"
                    )}>
                      {selectedItems.has(item.id) ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-white" />
                      )}
                    </div>
                  </div>
                )}

                {/* Type badge */}
                <Badge variant="secondary" className="absolute top-2 left-2 text-xs bg-black/60 text-white border-0">
                  {item.type === "image" && <ImageIcon className="h-3 w-3 mr-1" />}
                  {item.type === "video" && <VideoIcon className="h-3 w-3 mr-1" />}
                  {item.type === "voice" && <MicIcon className="h-3 w-3 mr-1" />}
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Badge>

                {/* Action buttons on hover */}
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent",
                    "flex flex-col justify-end p-3 transition-opacity",
                    hoveredItem === item.id ? "opacity-100" : "opacity-0",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-white/20 hover:bg-white/30 backdrop-blur"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(
                            item.result_url,
                            `${item.type}-${item.id}.${item.type === "voice" ? "mp3" : item.type === "video" ? "mp4" : "png"}`,
                          )
                        }}
                      >
                        <Download className="h-4 w-4 text-white" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 bg-white/20 hover:bg-white/30 backdrop-blur"
                            onClick={(e) => e.stopPropagation()}
                            disabled={isSharing}
                          >
                            {isSharing ? (
                              <Loader2 className="h-4 w-4 text-white animate-spin" />
                            ) : (
                              <Share2 className="h-4 w-4 text-white" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem
                            onClick={() => handleShare("native", item.result_url, item.prompt, item.type)}
                          >
                            <Share2 className="h-4 w-4 mr-2" /> Share{" "}
                            {item.type === "image" ? "Image" : item.type === "video" ? "Video" : "Audio"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleShare("twitter", item.result_url, item.prompt, item.type)}
                          >
                            <Twitter className="h-4 w-4 mr-2" /> Twitter
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleShare("facebook", item.result_url, item.prompt, item.type)}
                          >
                            <Facebook className="h-4 w-4 mr-2" /> Facebook
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleShare("instagram", item.result_url, item.prompt, item.type)}
                          >
                            <Instagram className="h-4 w-4 mr-2" /> Instagram
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleShare("snapchat", item.result_url, item.prompt, item.type)}
                          >
                            <Ghost className="h-4 w-4 mr-2" /> Snapchat
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleShare("whatsapp", item.result_url, item.prompt, item.type)}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleShare("linkedin", item.result_url, item.prompt, item.type)}
                          >
                            <Linkedin className="h-4 w-4 mr-2" /> LinkedIn
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleShare("copy", item.result_url, item.prompt, item.type)}
                          >
                            <LinkIcon className="h-4 w-4 mr-2" /> Copy Link
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 bg-red-500/80 hover:bg-red-500 backdrop-blur"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteItem(item)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Content info */}
              {gridSize === "large" && (
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{item.prompt || "No prompt"}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">{item.provider}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Fullscreen Preview Dialog */}
      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDialog()
          }
        }}
      >
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-black/95 border-zinc-800">
          {/* Close button */}
          <button
            onClick={handleCloseDialog}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>

          <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
            {/* Image preview */}
            {selectedItem?.type === "image" && selectedItem.result_url && (
              <div className="relative flex items-center justify-center">
                {/* Full quality image - using native img tag for best quality */}
                <img
                  src={selectedItem.result_url || "/placeholder.svg"}
                  alt={selectedItem.prompt || "Generated image"}
                  className="max-w-[90vw] max-h-[75vh] w-auto h-auto object-contain rounded-lg"
                />
              </div>
            )}

            {/* Video preview */}
            {selectedItem?.type === "video" && selectedItem.result_url && (
              <video
                src={selectedItem.result_url}
                controls
                autoPlay
                className="max-w-[90vw] max-h-[75vh] w-auto h-auto rounded-lg"
                playsInline
              />
            )}

            {/* Voice preview */}
            {selectedItem?.type === "voice" && selectedItem.result_url && (
              <div className="flex flex-col items-center py-8">
                <div
                  className={cn(
                    "w-32 h-32 rounded-full flex items-center justify-center cursor-pointer mb-6 transition-all",
                    playingAudio === selectedItem.result_url
                      ? "bg-gradient-to-br from-green-400 to-green-600 text-white scale-110"
                      : "bg-gradient-to-br from-green-500/30 to-green-600/20 text-green-400 hover:scale-105",
                  )}
                  onClick={() => playAudio(selectedItem.result_url)}
                >
                  {playingAudio === selectedItem.result_url ? (
                    <Pause className="h-16 w-16" />
                  ) : (
                    <Play className="h-16 w-16 ml-2" />
                  )}
                </div>
                <audio src={selectedItem.result_url} controls className="w-full max-w-md" />
              </div>
            )}

            {/* Info and actions */}
            <div className="mt-6 w-full max-w-2xl">
              {/* Prompt */}
              <p className="text-white/80 text-sm text-center mb-4 line-clamp-2">
                {selectedItem?.prompt || "No prompt"}
              </p>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-0"
                  onClick={() =>
                    selectedItem &&
                    handleDownload(
                      selectedItem.result_url,
                      `${selectedItem.type}-${selectedItem.id}.${selectedItem.type === "voice" ? "mp3" : selectedItem.type === "video" ? "mp4" : "png"}`,
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() =>
                        selectedItem &&
                        handleShare("twitter", selectedItem.result_url, selectedItem.prompt, selectedItem.type)
                      }
                    >
                      <Twitter className="h-4 w-4 mr-2" /> Twitter
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        selectedItem &&
                        handleShare("facebook", selectedItem.result_url, selectedItem.prompt, selectedItem.type)
                      }
                    >
                      <Facebook className="h-4 w-4 mr-2" /> Facebook
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        selectedItem &&
                        handleShare("instagram", selectedItem.result_url, selectedItem.prompt, selectedItem.type)
                      }
                    >
                      <Instagram className="h-4 w-4 mr-2" /> Instagram
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        selectedItem &&
                        handleShare("snapchat", selectedItem.result_url, selectedItem.prompt, selectedItem.type)
                      }
                    >
                      <Ghost className="h-4 w-4 mr-2" /> Snapchat
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        selectedItem &&
                        handleShare("whatsapp", selectedItem.result_url, selectedItem.prompt, selectedItem.type)
                      }
                    >
                      <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        selectedItem &&
                        handleShare("linkedin", selectedItem.result_url, selectedItem.prompt, selectedItem.type)
                      }
                    >
                      <Linkedin className="h-4 w-4 mr-2" /> LinkedIn
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        selectedItem &&
                        handleShare("copy", selectedItem.result_url, selectedItem.prompt, selectedItem.type)
                      }
                    >
                      <LinkIcon className="h-4 w-4 mr-2" /> Copy Link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="destructive" size="sm" onClick={() => selectedItem && setDeleteItem(selectedItem)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog - single item */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {deleteItem?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {deleteItem?.type} from your gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog - multiple items */}
      <AlertDialog open={showDeleteMultipleDialog} onOpenChange={setShowDeleteMultipleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedItems.size} item(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedItems.size} selected item(s) from your gallery including all associated files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteMultipleDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMultiple}
              disabled={isDeletingMultiple}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingMultiple ? `Deleting ${selectedItems.size}...` : `Delete ${selectedItems.size} item(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
