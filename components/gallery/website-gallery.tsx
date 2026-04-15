"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  GlobeIcon,
  ExternalLink,
  Trash2,
  Search,
  Grid3X3,
  LayoutGrid,
  Code,
  Download,
  Check,
  Loader2,
  Maximize2,
  CheckSquare,
  X,
  CheckCircle2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Website {
  id: string
  prompt: string
  result_url: string
  provider: string
  credits_used: number
  created_at: string
  status: string
  metadata?: any
}

interface WebsiteGalleryProps {
  websites: Website[]
}

export function WebsiteGallery({ websites }: WebsiteGalleryProps) {
  const router = useRouter()
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null)
  const [deleteWebsite, setDeleteWebsite] = useState<Website | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [gridSize, setGridSize] = useState<"small" | "large">("large")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [loadingIframes, setLoadingIframes] = useState<Set<string>>(new Set())
  const [failedIframes, setFailedIframes] = useState<Set<string>>(new Set())
  
  // Multi-select state
  const [selectMode, setSelectMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false)
  const [showDeleteMultipleDialog, setShowDeleteMultipleDialog] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deleteWebsite) return
    setIsDeleting(true)

    try {
      const response = await fetch("/api/image/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteWebsite.id }),
      })

      if (!response.ok) throw new Error("Failed to delete")

      toast.success("Website deleted successfully")
      router.refresh()
      setDeleteWebsite(null)
      setSelectedWebsite(null)
    } catch (error) {
      toast.error("Failed to delete website")
    } finally {
      setIsDeleting(false)
    }
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
    const allIds = filteredWebsites.map(w => w.id)
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

  // Delete multiple items - process sequentially
  const handleDeleteMultiple = async () => {
    if (selectedItems.size === 0) return
    setIsDeletingMultiple(true)

    let successCount = 0
    let failCount = 0
    const itemsToDelete = Array.from(selectedItems)

    try {
      for (const id of itemsToDelete) {
        setDeletingItemId(id)
        try {
          const response = await fetch("/api/image/delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })
          
          if (response.ok) {
            successCount++
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
        toast.success(`${successCount} website(s) deleted successfully`)
      }
      if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} website(s)`)
      }
      
      router.refresh()
      exitSelectMode()
      setShowDeleteMultipleDialog(false)
    } catch (error) {
      toast.error("Failed to delete websites")
    } finally {
      setIsDeletingMultiple(false)
    }
  }

  const handleCopyCode = async (url: string, id: string) => {
    try {
      const response = await fetch(url)
      const html = await response.text()
      await navigator.clipboard.writeText(html)
      setCopiedId(id)
      toast.success("HTML code copied to clipboard!")
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      toast.error("Failed to copy code")
    }
  }

  const handleDownload = async (url: string, prompt: string) => {
    try {
      const response = await fetch(url)
      const html = await response.text()
      const blob = new Blob([html], { type: "text/html" })
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = `website-${prompt?.slice(0, 30).replace(/\s+/g, "-") || "generated"}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
      toast.success("Website downloaded!")
    } catch (error) {
      toast.error("Failed to download")
    }
  }

  const handleIframeLoad = (id: string) => {
    setLoadingIframes((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const handleIframeError = (id: string) => {
    setLoadingIframes((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setFailedIframes((prev) => new Set(prev).add(id))
  }

  const filteredWebsites = searchQuery
    ? websites.filter((w) => w.prompt?.toLowerCase().includes(searchQuery.toLowerCase()))
    : websites

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-4">
      {/* Search and Grid Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">My Websites</h2>
          <Badge variant="secondary">{filteredWebsites.length}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!selectMode ? (
            <>
              <div className="relative flex-1 min-w-[150px] sm:flex-initial">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search websites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-[200px]"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => setGridSize(gridSize === "small" ? "large" : "small")}>
                {gridSize === "small" ? <LayoutGrid className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
              {filteredWebsites.length > 0 && (
                <Button variant="default" size="sm" onClick={() => setSelectMode(true)}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Select
                </Button>
              )}
            </>
          ) : (
            <>
              <Badge variant="secondary" className="text-sm">
                {selectedItems.size} selected
              </Badge>
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

      {/* Website Grid */}
      {filteredWebsites.length === 0 ? (
        <Card className="border-dashed">
          <div className="flex flex-col items-center justify-center py-16">
            <GlobeIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No websites yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery ? "No results found for your search" : "Start creating websites to see them here"}
            </p>
          </div>
        </Card>
      ) : (
        <div
          className={cn(
            "grid gap-4",
            gridSize === "small"
              ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {filteredWebsites.map((website) => (
            <Card
              key={website.id}
              className={cn(
                "group relative overflow-hidden cursor-pointer transition-all duration-300 hover:ring-2 hover:ring-primary/50 hover:shadow-xl",
                selectMode && selectedItems.has(website.id) && "ring-2 ring-primary bg-primary/5",
              )}
              onClick={() => {
                if (selectMode) {
                  toggleItemSelection(website.id)
                } else {
                  setSelectedWebsite(website)
                }
              }}
            >
              <div className={cn("relative bg-muted overflow-hidden", gridSize === "small" ? "h-40" : "h-56")}>
                {/* Loading overlay when this item is being deleted */}
                {deletingItemId === website.id && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
                    <span className="text-white text-sm font-medium">
                      Deleting website...
                    </span>
                  </div>
                )}

                {/* Selection checkbox in select mode */}
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
                        ? "bg-primary text-primary-foreground" 
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

                {/* Iframe container with scale transform for thumbnail effect */}
                <div className="absolute inset-0 overflow-hidden">
                  {failedIframes.has(website.id) ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-500/10 to-orange-600/5">
                      <GlobeIcon className="h-12 w-12 text-orange-500/50 mb-2" />
                      <p className="text-xs text-muted-foreground">Preview unavailable</p>
                    </div>
                  ) : (
                    <>
                      {/* Loading state */}
                      {loadingIframes.has(website.id) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {/* Scaled iframe for thumbnail preview */}
                      <div className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none">
                        <iframe
                          src={website.result_url}
                          className="w-full h-full border-0"
                          loading="lazy"
                          onLoad={() => handleIframeLoad(website.id)}
                          onError={() => handleIframeError(website.id)}
                          sandbox="allow-scripts allow-same-origin"
                          title={website.prompt || "Website preview"}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Overlay gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-white/20 hover:bg-white/30 backdrop-blur"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(website.result_url, "_blank")
                        }}
                      >
                        <ExternalLink className="h-4 w-4 text-white" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-white/20 hover:bg-white/30 backdrop-blur"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyCode(website.result_url, website.id)
                        }}
                      >
                        {copiedId === website.id ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Code className="h-4 w-4 text-white" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-white/20 hover:bg-white/30 backdrop-blur"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(website.result_url, website.prompt)
                        }}
                      >
                        <Download className="h-4 w-4 text-white" />
                      </Button>
                    </div>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 bg-red-500/80 hover:bg-red-500 backdrop-blur"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteWebsite(website)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                </div>

                {/* Type badge */}
                <Badge variant="secondary" className="absolute top-2 left-2 text-xs bg-black/60 text-white border-0">
                  <GlobeIcon className="h-3 w-3 mr-1" />
                  Website
                </Badge>

                {/* Expand icon */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-1.5 bg-black/60 rounded-lg">
                    <Maximize2 className="h-3 w-3 text-white" />
                  </div>
                </div>
              </div>

              {/* Content info */}
              {gridSize === "large" && (
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{website.prompt || "No description"}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">{website.provider}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(website.created_at)}</p>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Fullscreen Preview Dialog */}
      <Dialog open={!!selectedWebsite} onOpenChange={(open) => !open && setSelectedWebsite(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <GlobeIcon className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{selectedWebsite?.prompt || "Website"}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedWebsite?.provider} • {selectedWebsite && formatDate(selectedWebsite.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectedWebsite && window.open(selectedWebsite.result_url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectedWebsite && handleCopyCode(selectedWebsite.result_url, selectedWebsite.id)}
                >
                  {copiedId === selectedWebsite?.id ? (
                    <Check className="h-4 w-4 mr-1 text-green-500" />
                  ) : (
                    <Code className="h-4 w-4 mr-1" />
                  )}
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectedWebsite && handleDownload(selectedWebsite.result_url, selectedWebsite.prompt)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => selectedWebsite && setDeleteWebsite(selectedWebsite)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Iframe Preview */}
            <div className="flex-1 bg-white">
              {selectedWebsite && (
                <iframe
                  src={selectedWebsite.result_url}
                  className="w-full h-full border-0"
                  title={selectedWebsite.prompt || "Website preview"}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation - Single */}
      <AlertDialog open={!!deleteWebsite} onOpenChange={(open) => !open && setDeleteWebsite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Website</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this website? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation - Multiple */}
      <AlertDialog open={showDeleteMultipleDialog} onOpenChange={setShowDeleteMultipleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedItems.size} Website(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedItems.size} selected website(s) from your gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteMultipleDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMultiple}
              disabled={isDeletingMultiple}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingMultiple ? `Deleting ${selectedItems.size}...` : `Delete ${selectedItems.size} website(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
