"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { toast } from "sonner"
import { 
  Download, 
  Loader2, 
  Link as LinkIcon, 
  Music, 
  Video, 
  Clock, 
  ExternalLink,
  Copy,
  Youtube,
  Instagram,
  Twitter,
  Music2,
  Globe,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  HardDrive,
  Trash2,
  Share2,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

interface DownloadHistory {
  id: string
  prompt: string
  result_url: string
  created_at: string
  metadata: {
    platform: string
    quality: string
    format: string
    audioOnly: boolean
    filename: string
    originalUrl: string
  }
}

interface DownloadResult {
  downloadUrl: string
  filename: string
  platform: string
  quality: string
  format: string
}

const platformIcons: Record<string, React.ReactNode> = {
  "YouTube": <Youtube className="h-4 w-4" />,
  "Instagram": <Instagram className="h-4 w-4" />,
  "Twitter/X": <Twitter className="h-4 w-4" />,
  "TikTok": <Music2 className="h-4 w-4" />,
  "Spotify": <Music className="h-4 w-4" />,
  "SoundCloud": <Music className="h-4 w-4" />,
}

const platformColors: Record<string, string> = {
  "YouTube": "bg-red-500/10 text-red-500 border-red-500/20",
  "Instagram": "bg-pink-500/10 text-pink-500 border-pink-500/20",
  "Twitter/X": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "TikTok": "bg-black/10 text-foreground border-border",
  "Spotify": "bg-green-500/10 text-green-500 border-green-500/20",
  "SoundCloud": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "Reddit": "bg-orange-600/10 text-orange-600 border-orange-600/20",
  "Pinterest": "bg-red-600/10 text-red-600 border-red-600/20",
  "Vimeo": "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  "Facebook": "bg-blue-600/10 text-blue-600 border-blue-600/20",
  "Twitch": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "Bilibili": "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
  "Bluesky": "bg-sky-500/10 text-sky-500 border-sky-500/20",
  "Tumblr": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  "Snapchat": "bg-yellow-400/10 text-yellow-600 border-yellow-400/20",
  "Dailymotion": "bg-blue-400/10 text-blue-400 border-blue-400/20",
  "Loom": "bg-purple-600/10 text-purple-600 border-purple-600/20",
  "Streamable": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "OK.ru": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "VK": "bg-blue-600/10 text-blue-600 border-blue-600/20",
  "Rutube": "bg-gray-500/10 text-gray-500 border-gray-500/20",
}

export function VideoDownloaderStudio() {
  const [url, setUrl] = useState("")
  const [quality, setQuality] = useState("1080")
  const [format, setFormat] = useState("mp4")
  const [audioOnly, setAudioOnly] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null)
  const [currentDownload, setCurrentDownload] = useState<DownloadResult | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPlatform, setFilterPlatform] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"date" | "platform">("date")
  
  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showPlayer, setShowPlayer] = useState(false)

  // Platform detection patterns
  const platformPatterns: Record<string, RegExp> = {
    "YouTube": /(?:youtube\.com|youtu\.be)/,
    "TikTok": /tiktok\.com/,
    "Instagram": /instagram\.com/,
    "Twitter/X": /(?:twitter\.com|x\.com)/,
    "Reddit": /reddit\.com/,
    "Pinterest": /pinterest\.com/,
    "Spotify": /spotify\.com/,
    "SoundCloud": /soundcloud\.com/,
    "Vimeo": /vimeo\.com/,
    "Twitch": /twitch\.tv/,
    "Facebook": /facebook\.com/,
    "Bilibili": /bilibili\.com/,
    "Bluesky": /bsky\.app/,
    "Tumblr": /tumblr\.com/,
    "Snapchat": /snapchat\.com/,
    "Dailymotion": /dailymotion\.com/,
    "Loom": /loom\.com/,
    "Streamable": /streamable\.com/,
    "OK.ru": /ok\.ru/,
    "VK": /vk\.com/,
    "Rutube": /rutube\.ru/,
  }

  // Detect platform from URL
  useEffect(() => {
    if (url) {
      for (const [platform, pattern] of Object.entries(platformPatterns)) {
        if (pattern.test(url)) {
          setDetectedPlatform(platform)
          // Auto-switch to audio only for music platforms
          if (platform === "Spotify" || platform === "SoundCloud") {
            setAudioOnly(true)
          }
          return
        }
      }
      setDetectedPlatform(null)
    } else {
      setDetectedPlatform(null)
    }
  }, [url])

  // Fetch download history
  useEffect(() => {
    fetchHistory()
  }, [])

  // Video player state
  const [videoError, setVideoError] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)

  // Video player time update
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setVideoLoaded(true)
      setVideoError(false)
    }
    const handleEnded = () => setIsPlaying(false)
    const handleError = () => {
      setVideoError(true)
      setVideoLoaded(false)
      setIsPlaying(false)
    }
    const handleCanPlay = () => {
      setVideoLoaded(true)
      setVideoError(false)
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("ended", handleEnded)
    video.addEventListener("error", handleError)
    video.addEventListener("canplay", handleCanPlay)

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("ended", handleEnded)
      video.removeEventListener("error", handleError)
      video.removeEventListener("canplay", handleCanPlay)
    }
  }, [showPlayer])

  const fetchHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch("/api/video-downloader")
      if (response.ok) {
        const data = await response.json()
        setDownloadHistory(data.downloads || [])
      }
    } catch (error) {
      console.error("Error fetching history:", error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleDownload = async () => {
    if (!url.trim()) {
      toast.error("Please enter a video URL")
      return
    }

    setIsLoading(true)
    setDownloadProgress(0)
    setCurrentDownload(null)
    setVideoError(false)
    setVideoLoaded(false)
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 15
      })
    }, 500)

    try {
      const response = await fetch("/api/video-downloader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          quality,
          format,
          audioOnly,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if service is unavailable and redirect to cobalt.tools
        if (data.serviceUnavailable && data.cobaltLink) {
          toast.error("Service temporarily unavailable", {
            description: "Opening cobalt.tools for you to download directly",
            duration: 5000,
          })
          // Open cobalt.tools with the URL
          window.open(`${data.cobaltLink}?u=${encodeURIComponent(url)}`, "_blank")
          return
        }
        throw new Error(data.error || "Download failed")
      }

      clearInterval(progressInterval)
      setDownloadProgress(100)

      setCurrentDownload({
        downloadUrl: data.downloadUrl,
        filename: data.filename,
        platform: data.platform,
        quality: data.quality,
        format: data.format,
      })

      // Show video player for video downloads
      if (!audioOnly) {
        setShowPlayer(true)
      }

      toast.success(`${audioOnly ? "Audio" : "Video"} ready!`, {
        description: "Click the download button or preview below",
      })
      
      // Refresh history
      fetchHistory()
    } catch (error) {
      clearInterval(progressInterval)
      setDownloadProgress(0)
      toast.error(error instanceof Error ? error.message : "Download failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setUrl(text)
      toast.success("URL pasted from clipboard")
    } catch {
      toast.error("Failed to paste from clipboard")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Video player controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.volume = value[0]
      setVolume(value[0])
      setIsMuted(value[0] === 0)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        videoRef.current.requestFullscreen()
      }
    }
  }

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds
    }
  }

  // Filter and sort history
  const filteredHistory = downloadHistory
    .filter(item => {
      const matchesSearch = item.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.metadata?.platform?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPlatform = filterPlatform === "all" || item.metadata?.platform === filterPlatform
      return matchesSearch && matchesPlatform
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      return (a.metadata?.platform || "").localeCompare(b.metadata?.platform || "")
    })

  // Get unique platforms from history
  const uniquePlatforms = [...new Set(downloadHistory.map(item => item.metadata?.platform).filter(Boolean))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Video Downloader</h1>
          <p className="text-muted-foreground">
            Download videos from YouTube, TikTok, Instagram, Twitter, and 15+ platforms
          </p>
        </div>
        <Badge variant="outline" className="hidden sm:flex gap-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          15+ Platforms
        </Badge>
      </div>

      <Tabs defaultValue="download" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-none lg:inline-flex">
          <TabsTrigger value="download" className="gap-2">
            <Download className="h-4 w-4" />
            Download
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" />
            History ({downloadHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="download" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Download Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Enter Video URL
                </CardTitle>
                <CardDescription>
                  Paste a video URL from any supported platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* URL Input */}
                <div className="space-y-2">
                  <Label htmlFor="url">Video URL</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="pr-28"
                        onKeyDown={(e) => e.key === "Enter" && handleDownload()}
                      />
                      {detectedPlatform && (
                        <Badge 
                          className={`absolute right-2 top-1/2 -translate-y-1/2 ${platformColors[detectedPlatform] || "bg-muted"}`}
                        >
                          {platformIcons[detectedPlatform] || <Globe className="h-4 w-4" />}
                          <span className="ml-1">{detectedPlatform}</span>
                        </Badge>
                      )}
                    </div>
                    <Button variant="outline" onClick={handlePaste}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Options */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="quality">Quality</Label>
                    <Select value={quality} onValueChange={setQuality} disabled={audioOnly}>
                      <SelectTrigger id="quality">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="360">360p</SelectItem>
                        <SelectItem value="480">480p</SelectItem>
                        <SelectItem value="720">720p HD</SelectItem>
                        <SelectItem value="1080">1080p Full HD</SelectItem>
                        <SelectItem value="1440">1440p 2K</SelectItem>
                        <SelectItem value="2160">2160p 4K</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="format">Format</Label>
                    <Select value={format} onValueChange={setFormat} disabled={audioOnly}>
                      <SelectTrigger id="format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mp4">MP4</SelectItem>
                        <SelectItem value="webm">WebM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Audio Only</Label>
                    <p className="text-sm text-muted-foreground">
                      Extract audio as MP3
                    </p>
                  </div>
                  <Switch
                    checked={audioOnly}
                    onCheckedChange={setAudioOnly}
                  />
                </div>

                {/* Progress Bar */}
                {isLoading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Processing...</span>
                      <span className="font-medium">{Math.round(downloadProgress)}%</span>
                    </div>
                    <Progress value={downloadProgress} className="h-2" />
                  </div>
                )}

                {/* Download Buttons */}
                <div className="space-y-3">
                  <Button 
                    onClick={handleDownload} 
                    disabled={isLoading || !url.trim()}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {audioOnly ? <Music className="mr-2 h-5 w-5" /> : <Download className="mr-2 h-5 w-5" />}
                        Download {audioOnly ? "Audio" : "Video"}
                      </>
                    )}
                  </Button>
                  
                  {/* Direct link to cobalt.tools */}
                  <Button 
                    variant="outline"
                    className="w-full bg-transparent"
                    asChild
                  >
                    <a 
                      href={url ? `https://cobalt.tools/?u=${encodeURIComponent(url)}` : "https://cobalt.tools"} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open in cobalt.tools (Recommended)
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Video Preview / Result */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Preview & Download
                </CardTitle>
                <CardDescription>
                  Preview your video before downloading
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentDownload && (
                  <>
                    {/* Video Player */}
                    {showPlayer && !audioOnly && (
                      <div className="relative overflow-hidden rounded-lg bg-black aspect-video">
                        {videoError ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/90 text-center p-4">
                            <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
                            <p className="font-medium mb-1">Preview not available</p>
                            <p className="text-sm text-muted-foreground mb-4">
                              External videos cannot be previewed in the browser
                            </p>
                            <Button asChild>
                              <a 
                                href={currentDownload.downloadUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open in New Tab
                              </a>
                            </Button>
                          </div>
                        ) : (
                          <video
                            ref={videoRef}
                            src={currentDownload.downloadUrl}
                            className="h-full w-full"
                            onClick={togglePlay}
                            playsInline
                          />
                        )}
                        
                        {/* Video Controls Overlay - only show when video is loaded without error */}
                        {!videoError && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                            {/* Progress */}
                            <div className="mb-3">
                              <Slider
                                value={[currentTime]}
                                max={duration || 100}
                                step={0.1}
                                onValueChange={handleSeek}
                                className="cursor-pointer"
                              />
                              <div className="flex justify-between text-xs text-white/70 mt-1">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                              </div>
                            </div>
                            
                            {/* Controls */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-white hover:bg-white/20"
                                  onClick={() => skip(-10)}
                                >
                                  <SkipBack className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-white hover:bg-white/20 h-10 w-10"
                                  onClick={togglePlay}
                                >
                                  {isPlaying ? (
                                    <Pause className="h-6 w-6" />
                                  ) : (
                                    <Play className="h-6 w-6" />
                                  )}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-white hover:bg-white/20"
                                  onClick={() => skip(10)}
                                >
                                  <SkipForward className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-white hover:bg-white/20"
                                  onClick={toggleMute}
                                >
                                  {isMuted ? (
                                    <VolumeX className="h-4 w-4" />
                                  ) : (
                                    <Volume2 className="h-4 w-4" />
                                  )}
                                </Button>
                                <Slider
                                  value={[isMuted ? 0 : volume]}
                                  max={1}
                                  step={0.1}
                                  onValueChange={handleVolumeChange}
                                  className="w-24"
                                />
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-white hover:bg-white/20"
                                  onClick={toggleFullscreen}
                                >
                                  <Maximize className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Audio Player */}
                    {audioOnly && (
                      <div className="rounded-lg border bg-muted/50 p-6 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                          <Music className="h-8 w-8 text-primary" />
                        </div>
                        <p className="font-medium">{currentDownload.filename}</p>
                        <p className="text-sm text-muted-foreground">Audio file ready</p>
                      </div>
                    )}

                    {/* Download Info */}
                    <div className="flex flex-wrap gap-2">
                      <Badge className={platformColors[currentDownload.platform] || "bg-muted"}>
                        {platformIcons[currentDownload.platform] || <Globe className="h-4 w-4" />}
                        <span className="ml-1">{currentDownload.platform}</span>
                      </Badge>
                      <Badge variant="secondary">
                        {audioOnly ? "MP3" : `${currentDownload.quality}p ${currentDownload.format.toUpperCase()}`}
                      </Badge>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1"
                        onClick={() => window.open(currentDownload.downloadUrl, "_blank")}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => copyToClipboard(currentDownload.downloadUrl)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: currentDownload.filename,
                              url: currentDownload.downloadUrl,
                            })
                          } else {
                            copyToClipboard(currentDownload.downloadUrl)
                          }
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
                {!currentDownload && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                      <Video className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground">No video loaded</p>
                    <p className="text-sm text-muted-foreground/70">
                      Enter a URL and click download to preview
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Supported Platforms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Supported Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(platformColors).map(([platform, color]) => (
                  <Badge key={platform} variant="outline" className={color}>
                    {platformIcons[platform] || <Globe className="h-4 w-4" />}
                    <span className="ml-1">{platform}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Download History
                  </CardTitle>
                  <CardDescription>
                    {filteredHistory.length} of {downloadHistory.length} downloads
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchHistory}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search downloads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                  <SelectTrigger className="w-full sm:w-40">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    {uniquePlatforms.map(platform => (
                      <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "platform")}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Date
                      </div>
                    </SelectItem>
                    <SelectItem value="platform">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Platform
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* History List */}
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Download className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground">
                    {searchQuery || filterPlatform !== "all" ? "No matching downloads" : "No downloads yet"}
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    {searchQuery || filterPlatform !== "all" 
                      ? "Try adjusting your filters" 
                      : "Your download history will appear here"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`rounded-lg p-2.5 ${platformColors[item.metadata?.platform] || "bg-muted"}`}>
                          {item.metadata?.audioOnly ? (
                            <Music className="h-5 w-5" />
                          ) : (
                            <Video className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {item.metadata?.platform || "Unknown"}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {item.metadata?.audioOnly ? "Audio" : `${item.metadata?.quality}p`}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1 max-w-lg">
                            {item.prompt}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(item.prompt)}
                          title="Copy URL"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(item.result_url, "_blank")}
                          title="Download again"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
