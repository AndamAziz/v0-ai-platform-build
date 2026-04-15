"use client"

import { Switch } from "@/components/ui/switch"

import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Profile, Generation } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Download,
  Video,
  Volume2,
  VolumeX,
  User,
  Mic,
  Sparkles,
  CheckCircle,
  Upload,
  X,
  FileText,
  ImageIcon,
  Share2,
  Twitter,
  Facebook,
  Linkedin,
  Copy,
  Server,
  Clock,
  Zap,
  Music,
  Loader2,
  Type,
  Play,
  Film,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CREDIT_COSTS } from "@/lib/types"

interface VideoStudioProps {
  profile: Profile | null
  generations: Generation[]
}

type GeneratedVideo = { 
  url: string | null
  status: string
  videoUrl?: string  // Original MP4 URL for download
  gifUrl?: string    // GIF URL for preview
  customAudioUrl?: string // Custom MP3 URL for synchronized playback
}

type VideoMode = "talking" | "prompt"

// Hugging Face Gradio Spaces - FREE video generation (tested & working)
const HF_VIDEO_MODELS = [
  // TEXT TO VIDEO (FREE)
  { id: "ltx-video-fast", name: "LTX Video (Text to Video)", description: "Fast text to video - FREE", requiresImage: false },
  // IMAGE TO VIDEO (FREE)  
  { id: "dream-wan2-2-faster", name: "Wan2.2 (Image to Video)", description: "Convert image to video - FREE", requiresImage: true },
]

// Freepik AI Video Models
const FREEPIK_VIDEO_MODELS = [
  { id: "wan-2.6-720p", name: "WAN 2.6 (720p)", description: "High quality text-to-video - 15 credits", credits: 15, type: "text-to-video" },
  { id: "wan-2.6-1080p", name: "WAN 2.6 (1080p)", description: "Full HD text-to-video - 20 credits", credits: 20, type: "text-to-video" },
  { id: "kling-o1-pro", name: "Kling O1 Pro", description: "Premium image-to-video - 30 credits", credits: 30, type: "image-to-video" },
  { id: "kling-2.5-pro", name: "Kling 2.5 Pro", description: "High quality image-to-video - 25 credits", credits: 25, type: "image-to-video" },
]

const FREEPIK_DURATIONS = [
  { value: 5, label: "5 seconds" },
  { value: 10, label: "10 seconds" },
  { value: 15, label: "15 seconds" },
  ]
  
  const FREEPIK_KLING_DURATIONS = [
  { value: 5, label: "5 seconds" },
  { value: 10, label: "10 seconds" },
  ]

const FREEPIK_ASPECT_RATIOS = [
  { value: "widescreen_16_9", label: "Landscape (16:9)" },
  { value: "social_story_9_16", label: "Portrait (9:16)" },
  { value: "square_1_1", label: "Square (1:1)" },
]

const FREEPIK_SIZES = [
  { value: "1280*720", label: "720p Landscape (1280x720)" },
  { value: "720*1280", label: "720p Portrait (720x1280)" },
  { value: "1920*1080", label: "1080p Landscape (1920x1080)" },
  { value: "1080*1920", label: "1080p Portrait (1080x1920)" },
]

const VIDEO_PROVIDERS = [
  {
    id: "wan22-gif",
    name: "AI GIF/Video (Free)",
    description: "Create 8sec animated GIFs (4 frames) or videos with music",
    icon: Sparkles,
    speed: "fast",
    speedLabel: "Free",
    time: "~20-40s",
    color: "green",
    requiresImage: false,
  },
  {
    id: "d-id",
    name: "D-ID",
    description: "Talking head videos with voice",
    icon: User,
    speed: "fast",
    speedLabel: "Fast",
    time: "~30s",
    color: "green",
    requiresImage: true,
  },
  {
    id: "vps2",
    name: "VPS2",
    description: "AI video from text prompt",
    icon: Server,
    speed: "slow",
    speedLabel: "Slow",
    time: "~1-2 min",
    color: "yellow",
    requiresImage: false,
  },
  {
    id: "huggingface",
    name: "Hugging Face (Free)",
    description: "LTX Video & Wan2.2 - Free video generation",
    icon: Zap,
    speed: "medium",
    speedLabel: "Free",
    time: "~1-3 min",
    color: "blue",
    requiresImage: false,
  },
  {
    id: "freepik",
    name: "Freepik AI Video",
    description: "WAN 2.6 & Kling - High quality AI video (image optional)",
    icon: Sparkles,
    speed: "medium",
    speedLabel: "Premium",
    time: "~2-8 min",
    color: "purple",
    requiresImage: false,
  },
  {
    id: "json2video",
    name: "Audio Merge (JSON2Video)",
    description: "Merge your image/video with audio - NOT AI generation",
    icon: Film,
    speed: "fast",
    speedLabel: "Merge",
    time: "~30s-1min",
    color: "orange",
    requiresImage: true, // Requires image or video
  },
]

const DID_VOICES = [
  // Kurdish voices (using Kurdish TTS API)
  { id: "kurdish_sorani_male", name: "Kurdish Sorani (Male)", lang: "ku", provider: "kurdish" },
  { id: "kurdish_sorani_female", name: "Kurdish Sorani (Female)", lang: "ku", provider: "kurdish" },
  { id: "kurdish_kurmanji_male", name: "Kurdish Kurmanji (Male)", lang: "ku", provider: "kurdish" },
  { id: "kurdish_kurmanji_female", name: "Kurdish Kurmanji (Female)", lang: "ku", provider: "kurdish" },
  // Microsoft voices
  { id: "en-US-JennyNeural", name: "Jenny (English US)", lang: "en", provider: "microsoft" },
  { id: "en-US-GuyNeural", name: "Guy (English US)", lang: "en", provider: "microsoft" },
  { id: "en-GB-SoniaNeural", name: "Sonia (English UK)", lang: "en", provider: "microsoft" },
  { id: "ar-SA-ZariyahNeural", name: "Zariyah (Arabic)", lang: "ar", provider: "microsoft" },
  { id: "ar-SA-HamedNeural", name: "Hamed (Arabic)", lang: "ar", provider: "microsoft" },
  { id: "tr-TR-EmelNeural", name: "Emel (Turkish)", lang: "tr", provider: "microsoft" },
  { id: "de-DE-KatjaNeural", name: "Katja (German)", lang: "de", provider: "microsoft" },
  { id: "fr-FR-DeniseNeural", name: "Denise (French)", lang: "fr", provider: "microsoft" },
  { id: "es-ES-ElviraNeural", name: "Elvira (Spanish)", lang: "es", provider: "microsoft" },
  { id: "zh-CN-XiaoxiaoNeural", name: "Xiaoxiao (Chinese)", lang: "zh", provider: "microsoft" },
  { id: "ja-JP-NanamiNeural", name: "Nanami (Japanese)", lang: "ja", provider: "microsoft" },
  { id: "ko-KR-SunHiNeural", name: "SunHi (Korean)", lang: "ko", provider: "microsoft" },
]

const ASPECT_RATIOS = [
  { id: "16:9", name: "Landscape (16:9)" },
  { id: "9:16", name: "Portrait (9:16)" },
  { id: "1:1", name: "Square (1:1)" },
]

const VPS2_AUDIO_TYPES = [
  { id: "none", name: "No Audio", icon: VolumeX },
  { id: "voice", name: "Voice Narration", icon: Mic },
  { id: "music", name: "Background Music", icon: Music },
  { id: "custom", name: "Custom MP3 Upload", icon: Upload },
]

const VPS2_MUSIC_STYLES = [
  { id: "ambient", name: "Ambient" },
  { id: "cinematic", name: "Cinematic" },
  { id: "upbeat", name: "Upbeat" },
  { id: "sad", name: "Sad / Emotional" },
]

const VPS2_VOICE_LANGS = [
  { id: "ckb", name: "Kurdish Sorani", icon: "🇮🇶" },
  { id: "kmr", name: "Kurdish Kurmanji", icon: "🇹🇷" },
  { id: "en", name: "English", icon: "🇺🇸" },
  { id: "ar", name: "Arabic", icon: "🇸🇦" },
  { id: "fa", name: "Persian", icon: "🇮🇷" },
  { id: "tr", name: "Turkish", icon: "🇹🇷" },
  { id: "de", name: "German", icon: "🇩🇪" },
  { id: "fr", name: "French", icon: "🇫🇷" },
  { id: "es", name: "Spanish", icon: "🇪🇸" },
]

const VPS2_VOICE_GENDERS = [
  { id: "male", name: "Male", icon: "👨" },
  { id: "female", name: "Female", icon: "👩" },
]

const VPS2_DURATIONS = [
  { id: "2", name: "2 seconds (Fast)", time: "~2 min" },
  { id: "10", name: "10 seconds", time: "~3 min" },
  { id: "30", name: "30 seconds", time: "~4 min" },
  { id: "60", name: "1 minute", time: "~5 min" },
  { id: "120", name: "2 minutes", time: "~8 min" },
  { id: "180", name: "3 minutes", time: "~12 min" },
  { id: "300", name: "5 minutes (Max)", time: "~20 min" },
]

const VPS2_VIDEO_MODES = [
  { id: "text", name: "Text to Video", description: "Create video from text description", icon: Type },
  { id: "image", name: "Image to Video", description: "Animate your image with motion", icon: ImageIcon },
  { id: "lipsync", name: "Lip Sync", description: "Make image speak with voice", icon: Mic },
]

export function VideoStudio({ profile, generations }: VideoStudioProps) {
  const [textInput, setTextInput] = useState("")
  const [aspectRatio, setAspectRatio] = useState("16:9")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState("")
  const [selectedProvider, setSelectedProvider] = useState("d-id")

  const [selectedVoice, setSelectedVoice] = useState("kurdish_sorani_male")
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [customImageUrl, setCustomImageUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [didAvailable, setDidAvailable] = useState<boolean | null>(null)
  const [vps2Available, setVps2Available] = useState<boolean | null>(null)
  const [checkingApi, setCheckingApi] = useState(true)

  const audioContextRef = useRef<AudioContext | null>(null)
  const oscillatorRef = useRef<OscillatorNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const router = useRouter()

  const [vps2AudioType, setVps2AudioType] = useState("none")
  const [vps2VoiceText, setVps2VoiceText] = useState("")
  const [vps2VoiceLang, setVps2VoiceLang] = useState("ckb")
  const [vps2VoiceGender, setVps2VoiceGender] = useState("male")
  const [vps2MusicStyle, setVps2MusicStyle] = useState("ambient")
  const [vps2Duration, setVps2Duration] = useState("2")
  const [hfSelectedModel, setHfSelectedModel] = useState("ltx-video-fast")
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null)
  const [customAudioUrl, setCustomAudioUrl] = useState("")
  const [isUploadingAudio, setIsUploadingAudio] = useState(false)
  const audioInputRef = useRef<HTMLInputElement>(null)
  
  // VPS2 Image to Video
  const [vps2VideoMode, setVps2VideoMode] = useState("text")
  const [vps2ImageFile, setVps2ImageFile] = useState<File | null>(null)
  const [vps2ImageUrl, setVps2ImageUrl] = useState("")
  const [isUploadingVps2Image, setIsUploadingVps2Image] = useState(false)
  const vps2ImageInputRef = useRef<HTMLInputElement>(null)
  
  // Freepik Video Settings
  const [freepikModel, setFreepikModel] = useState("wan-2.6-720p")
  const [freepikDuration, setFreepikDuration] = useState(5)
  const [freepikSize, setFreepikSize] = useState("1280*720")
  const [freepikAspectRatio, setFreepikAspectRatio] = useState("widescreen_16_9")
  const [freepikImageUrl, setFreepikImageUrl] = useState("")
  const [freepikImageFile, setFreepikImageFile] = useState<File | null>(null)
  const [isUploadingFreepikImage, setIsUploadingFreepikImage] = useState(false)
  const freepikImageInputRef = useRef<HTMLInputElement>(null)
  const [freepikUseFaceReference, setFreepikUseFaceReference] = useState(false)
  const [freepikNegativePrompt, setFreepikNegativePrompt] = useState("")
  
  // VPS2 Negative Prompt
  const [vps2NegativePrompt, setVps2NegativePrompt] = useState("")
  
  // Check if selected model is image-to-video
  const isFreepikI2V = freepikModel.includes("kling")
  
  // Add MP3 to Video Dialog
  const [showAddAudioDialog, setShowAddAudioDialog] = useState(false)
  const [selectedVideoForAudio, setSelectedVideoForAudio] = useState("")
  const [audioUrlForMerge, setAudioUrlForMerge] = useState("")
  const [audioFileForMerge, setAudioFileForMerge] = useState<File | null>(null)
  const [isUploadingMergeAudio, setIsUploadingMergeAudio] = useState(false)
  const [isMergingAudio, setIsMergingAudio] = useState(false)
  const mergeAudioInputRef = useRef<HTMLInputElement>(null)

  const hasImage = !!(uploadedImage || customImageUrl)
  const currentProvider = VIDEO_PROVIDERS.find((p) => p.id === selectedProvider)
  const selectedHfModel = HF_VIDEO_MODELS.find((m) => m.id === hfSelectedModel)
  const mode: VideoMode = selectedProvider === "vps2" || selectedProvider === "huggingface" || selectedProvider === "freepik" ? "prompt" : hasImage ? "talking" : "prompt"

// Updated canGenerate to check provider availability
  const canGenerate =
  (selectedProvider === "d-id" && didAvailable) ||
  (selectedProvider === "vps2" && vps2Available) ||
  selectedProvider === "huggingface" || // HF is always available for Pro users
  selectedProvider === "freepik" || // Freepik available with credits
  selectedProvider === "json2video" || // JSON2Video always available
  profile?.role === "admin" ||
  (profile?.credits || 0) >= CREDIT_COSTS.video

  useEffect(() => {
    // Updated to call checkAPIStatus
    checkAPIStatus()
    return () => {
      stopSound()
    }
  }, [])

  const checkAPIStatus = async () => {
    setCheckingApi(true)
    try {
      const response = await fetch("/api/video/check-status")
      const data = await response.json()
      setDidAvailable(data.didAvailable || false)
      setVps2Available(data.vps2Available || false)
    } catch {
      setDidAvailable(false)
      setVps2Available(false)
    } finally {
      setCheckingApi(false)
    }
  }

// Compress image for mobile - handles large/high quality images
const compressImageForUpload = (file: File, maxWidth = 1200, quality = 0.85): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      
      // Calculate dimensions
      let width = img.width
      let height = img.height
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      // Create canvas and draw
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas not supported"))
        return
      }
      
      // White background for JPEG
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Failed to compress"))
          }
        },
        "image/jpeg",
        quality
      )
    }
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(file)
  })
}

const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  
  // Only allow images
  if (!file.type.startsWith("image/")) {
    toast.error("Please select an image file")
    return
  }
  
  // 20MB max for original
  if (file.size > 20 * 1024 * 1024) {
    toast.error("File must be less than 20MB")
    return
  }
  
  setIsUploading(true)
  
  try {
    // Compress large images for mobile compatibility
    let fileToUpload: Blob | File = file
    
    // Compress if larger than 500KB
    if (file.size > 500 * 1024) {
      fileToUpload = await compressImageForUpload(file, 1200, 0.85)
    }
    
    // Upload to Vercel Blob
    const formData = new FormData()
    formData.append("file", fileToUpload, file.name.replace(/\.[^.]+$/, ".jpg"))
    
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })
    
    if (!response.ok) {
      throw new Error("Upload failed")
    }
    
    const data = await response.json()
    if (data.url) {
      setUploadedImage(data.url)
      setCustomImageUrl("")
      toast.success("Image uploaded")
    } else {
      throw new Error("No URL returned")
    }
  } catch (err) {
    toast.error("Failed to upload image")
  } finally {
    setIsUploading(false)
  }
}

  const removeUploadedImage = () => {
    setUploadedImage(null)
    setCustomImageUrl("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith("audio/")) {
      toast.error("Please select an audio file (MP3, WAV, etc.)")
      return
    }
    
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Audio file must be less than 20MB")
      return
    }
    
    setIsUploadingAudio(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      
      if (!response.ok) throw new Error("Upload failed")
      
      const data = await response.json()
      setCustomAudioUrl(data.url)
      setCustomAudioFile(file)
      toast.success("Audio uploaded successfully!")
    } catch (err) {
      toast.error("Failed to upload audio")
    } finally {
      setIsUploadingAudio(false)
    }
  }

  const removeCustomAudio = () => {
    setCustomAudioFile(null)
    setCustomAudioUrl("")
    if (audioInputRef.current) {
      audioInputRef.current.value = ""
    }
  }

  const handleVps2ImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB")
      return
    }
    
    setIsUploadingVps2Image(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      
      if (!response.ok) throw new Error("Upload failed")
      
      const data = await response.json()
      setVps2ImageUrl(data.url)
      setVps2ImageFile(file)
      toast.success("Image uploaded!")
    } catch (err) {
      toast.error("Failed to upload image")
    } finally {
      setIsUploadingVps2Image(false)
    }
  }

  const removeVps2Image = () => {
    setVps2ImageFile(null)
    setVps2ImageUrl("")
    if (vps2ImageInputRef.current) {
      vps2ImageInputRef.current.value = ""
    }
  }

  // Freepik Image Upload
  const handleFreepikImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB")
      return
    }
    
    setIsUploadingFreepikImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      
      if (!response.ok) throw new Error("Upload failed")
      
      const data = await response.json()
      setFreepikImageUrl(data.url)
      setFreepikImageFile(file)
      toast.success("Image uploaded for Freepik!")
    } catch (err) {
      toast.error("Failed to upload image")
    } finally {
      setIsUploadingFreepikImage(false)
    }
  }

  const removeFreepikImage = () => {
    setFreepikImageFile(null)
    setFreepikImageUrl("")
    if (freepikImageInputRef.current) {
      freepikImageInputRef.current.value = ""
    }
  }

  // MP3 Upload for Merge Dialog
  const handleMergeAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith("audio/") && !file.name.endsWith(".mp3")) {
      toast.error("Please select an MP3 audio file")
      return
    }
    
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Audio file must be less than 50MB")
      return
    }
    
    setIsUploadingMergeAudio(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      
      if (!response.ok) throw new Error("Upload failed")
      
      const data = await response.json()
      setAudioUrlForMerge(data.url)
      setAudioFileForMerge(file)
      toast.success("MP3 uploaded successfully!")
    } catch (err) {
      toast.error("Failed to upload audio")
    } finally {
      setIsUploadingMergeAudio(false)
    }
  }

  const removeMergeAudio = () => {
    setAudioFileForMerge(null)
    setAudioUrlForMerge("")
    if (mergeAudioInputRef.current) {
      mergeAudioInputRef.current.value = ""
    }
  }

  const startSound = () => {
    if (!soundEnabled) return
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      oscillatorRef.current = audioContextRef.current.createOscillator()
      gainNodeRef.current = audioContextRef.current.createGain()

      oscillatorRef.current.type = "sine"
      oscillatorRef.current.frequency.setValueAtTime(220, audioContextRef.current.currentTime)
      gainNodeRef.current.gain.setValueAtTime(0.05, audioContextRef.current.currentTime)

      oscillatorRef.current.connect(gainNodeRef.current)
      gainNodeRef.current.connect(audioContextRef.current.destination)
      oscillatorRef.current.start()

      const modulateFreq = () => {
        if (oscillatorRef.current && audioContextRef.current) {
          const freq = 180 + Math.sin(Date.now() / 1000) * 40
          oscillatorRef.current.frequency.setValueAtTime(freq, audioContextRef.current.currentTime)
        }
      }
      const interval = setInterval(modulateFreq, 100)
      ;(audioContextRef.current as any).modulateInterval = interval
    } catch (e) {
      console.log("Audio not supported")
    }
  }

  const stopSound = () => {
    try {
      if ((audioContextRef.current as any)?.modulateInterval) {
        clearInterval((audioContextRef.current as any).modulateInterval)
      }
      if (oscillatorRef.current) {
        oscillatorRef.current.stop()
        oscillatorRef.current.disconnect()
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    } catch (e) {}
    oscillatorRef.current = null
    gainNodeRef.current = null
    audioContextRef.current = null
  }

  const playSuccessSound = () => {
    if (!soundEnabled) return
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(523.25, ctx.currentTime)
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1)
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch (e) {}
  }

  const playErrorSound = () => {
    if (!soundEnabled) return
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sawtooth"
      osc.frequency.setValueAtTime(200, ctx.currentTime)
      osc.frequency.setValueAtTime(150, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    } catch (e) {}
  }

const handleGenerate = async () => {
  // For VPS2: prompt is optional when image is uploaded (image/lipsync modes)
  const hasImage = vps2ImageUrl && (vps2VideoMode === "image" || vps2VideoMode === "lipsync")
  const needsVoiceText = vps2VideoMode === "lipsync" && vps2AudioType === "voice"
  
  if (selectedProvider === "vps2") {
    // Lip-sync mode requires image and voice text
    if (vps2VideoMode === "lipsync" && !vps2ImageUrl) {
      toast.error("Please upload an image for lip-sync")
      return
    }
    if (needsVoiceText && !vps2VoiceText.trim()) {
      toast.error("Please enter voice text for lip-sync")
      return
    }
    // Image mode requires image
    if (vps2VideoMode === "image" && !vps2ImageUrl) {
      toast.error("Please upload an image")
      return
    }
    // Text mode requires prompt
    if (vps2VideoMode === "text" && !textInput.trim()) {
      toast.error("Please enter a description for your video")
      return
    }
} else if (selectedProvider === "freepik") {
  if (!textInput.trim()) {
  toast.error("Please enter a prompt for Freepik AI video")
  return
  }
  // Kling models work best with an image but can work without
  // No validation needed - image is optional
  } else if (selectedProvider === "json2video") {
  if (!customAudioUrl) {
  toast.error("Please upload an audio file (MP3) to merge")
  return
  }
  } else if (!textInput.trim() && !hasImage) {
  toast.error(
  selectedProvider === "huggingface"
  ? "Please enter a description for your video"
  : "Please enter text to be spoken",
  )
  return
  }

    if (!canGenerate) {
      toast.error("Video generation is not available. Please check API status.")
      return
    }

    // D-ID requires image
    if (selectedProvider === "d-id") {
      const imageToUse = uploadedImage || customImageUrl
      if (!imageToUse) {
        toast.error("Please upload an image for the presenter to create a talking video")
        return
      }
    }

    setIsGenerating(true)
    setProgress(0)
    setProgressText("Initializing...")
    setGeneratedVideos((prev) => [{ url: null, status: "generating" }, ...prev])

    startSound()

    // Different progress steps based on provider
    const progressSteps =
selectedProvider === "wan22-gif"
  ? [
  { progress: 10, text: "Sending to VPS2..." },
  { progress: 30, text: "Generating frame 1/4..." },
  { progress: 50, text: "Generating frame 2/4..." },
  { progress: 70, text: "Generating frame 3/4..." },
  { progress: 85, text: "Generating frame 4/4..." },
  { progress: 95, text: "Creating animated GIF..." },
  ]
        : selectedProvider === "vps2"
        ? [
            { progress: 5, text: "Sending to VPS2..." },
            { progress: 10, text: "Loading Wan2.1 model..." },
            { progress: 20, text: "Generating video frames..." },
            { progress: 30, text: "This may take 5-10 minutes on CPU..." },
            { progress: 40, text: "Still processing..." },
            { progress: 50, text: "Adding audio if requested..." },
            { progress: 60, text: "Almost there..." },
            { progress: 70, text: "Encoding video..." },
            { progress: 80, text: "Finalizing..." },
            { progress: 90, text: "Nearly done..." },
            { progress: 95, text: "Uploading video..." },
          ]
: selectedProvider === "freepik"
  ? [
  { progress: 10, text: "Sending to Freepik AI..." },
  { progress: 25, text: "Processing video request..." },
  { progress: 40, text: "Generating frames..." },
  { progress: 55, text: "AI creating video..." },
  { progress: 70, text: "Encoding video..." },
  { progress: 85, text: "Finalizing..." },
  { progress: 95, text: "Almost done..." },
  ]
  : selectedProvider === "huggingface"
  ? [
  { progress: 10, text: "Sending to Hugging Face..." },
  { progress: 20, text: "Loading HunyuanVideo model..." },
              { progress: 40, text: "Generating video frames..." },
              { progress: 60, text: "Processing animation..." },
              { progress: 80, text: "Encoding video..." },
              { progress: 95, text: "Almost done..." },
            ]
          : [
              { progress: 10, text: "Sending to D-ID..." },
              { progress: 25, text: "Processing image..." },
              { progress: 40, text: "Generating speech..." },
              { progress: 55, text: "Animating face..." },
              { progress: 70, text: "Syncing lips..." },
              { progress: 85, text: "Rendering video..." },
              { progress: 95, text: "Almost done..." },
            ]

    let stepIndex = 0
    const intervalTime = selectedProvider === "wan22-gif" ? 8000 : selectedProvider === "vps2" ? 30000 : selectedProvider === "huggingface" ? 30000 : selectedProvider === "freepik" ? 10000 : 8000
    const progressInterval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        setProgress(progressSteps[stepIndex].progress)
        setProgressText(progressSteps[stepIndex].text)
        stepIndex++
      }
    }, intervalTime)

    try {
      const imageToUse = uploadedImage || customImageUrl
      const voiceInfo = DID_VOICES.find((v) => v.id === selectedVoice)

      let requestBody: any
      
      // WAN 2.2 + GIF provider - Use VPS2 create-gif API
      if (selectedProvider === "wan22-gif") {
        if (!textInput.trim()) {
          toast.error("Please enter a prompt for GIF generation")
          clearInterval(progressInterval)
          stopSound()
          setIsGenerating(false)
          setGeneratedVideos((prev) => prev.slice(1))
          return
        }

const response = await fetch("/api/video/wan22-gif", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
  prompt: textInput.trim(),
  imageUrl: imageToUse || undefined,
  mp3_url: customAudioUrl || undefined, // Add audio for video conversion
  negative_prompt: vps2NegativePrompt || undefined,
  }),
  })

        const data = await response.json()
        
        clearInterval(progressInterval)
        stopSound()
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to generate GIF/Video")
        }

        setProgress(100)
        setProgressText("Complete!")
        playSuccessSound()

        // Use video_url if audio was added, otherwise gif_url
        const resultUrl = data.video_url || data.gif_url
        const hasAudio = data.has_audio || false
        setGeneratedVideos((prev) => [
          { 
            url: resultUrl, 
            status: "completed",
            gifUrl: data.gif_url,
            videoUrl: data.video_url,
            hasAudio: hasAudio,
          } as GeneratedVideo, 
          ...prev.slice(1)
        ])
        
        toast.success(hasAudio ? "Video with audio created!" : "GIF created successfully!")
        router.refresh()
        return
      } else if (selectedProvider === "vps2") {
        // VPS2 - Use server action for direct API call
        const { generateVps2Video } = await import("@/app/actions/generateVps2Video")
        
        const duration = parseInt(vps2Duration) || 5
        // Pass image URL for Ken Burns effect (free, no GPU needed)
        const imageForVideo = vps2ImageUrl || uploadedImage || customImageUrl
        const result = await generateVps2Video(textInput.trim() || "Video", duration, imageForVideo)
        
        if (!result.videoUrl) {
          clearInterval(progressInterval)
          stopSound()
          throw new Error("No video URL returned from server")
        }
        
        let finalVideoUrl = result.videoUrl
        
        // Merge MP3 if provided
        if (audioUrlForMerge) {
          setProgressText("Adding background music...")
          setProgress(95)
          try {
            const mergeRes = await fetch("/api/video/wan22-gif", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                merge_mode: true,
                video_url: result.videoUrl,
                mp3_url: audioUrlForMerge,
              }),
            })
            const mergeData = await mergeRes.json()
            if (mergeRes.ok && mergeData.video_url) {
              finalVideoUrl = mergeData.video_url
            }
          } catch (mergeErr) {
            console.log("Audio merge failed, using original video")
          }
        }
        
        clearInterval(progressInterval)
        stopSound()

        setProgress(100)
        setProgressText("Complete!")
        playSuccessSound()
        
        setGeneratedVideos((prev) => [
          { 
            url: finalVideoUrl, 
            status: "completed",
            customAudioUrl: audioUrlForMerge || undefined,
          } as GeneratedVideo, 
          ...prev.slice(1)
        ])
        
        toast.success(audioUrlForMerge ? "Video with music generated!" : "Video generated successfully!")
        router.refresh()
        return
} else if (selectedProvider === "freepik") {
  // Freepik AI Video
  const imageUrl = isFreepikI2V ? (freepikImageUrl || uploadedImage || customImageUrl) : undefined
  const response = await fetch("/api/video/freepik", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
  prompt: textInput.trim(),
  model: freepikModel,
  duration: freepikDuration,
  size: freepikSize,
  aspect_ratio: freepikAspectRatio,
  image_url: imageUrl,
  negative_prompt: freepikNegativePrompt || undefined,
  use_face_reference: isFreepikI2V && freepikUseFaceReference ? true : undefined,
  }),
  })

        const data = await response.json()
        
        if (!response.ok) {
          // If Freepik server is temporarily busy, show friendly message
          if (response.status === 503 || data.retryable) {
            clearInterval(progressInterval)
            stopSound()
            setProgress(0)
            setProgressText("")
            setGeneratedVideos((prev) => prev.slice(1))
            toast.error("Freepik server is busy. Please wait a moment and try again.")
            return
          }
          clearInterval(progressInterval)
          stopSound()
          throw new Error(data.error || "Failed to generate video")
        }

        // If video completed immediately
        if (data.video_url) {
          clearInterval(progressInterval)
          stopSound()
          setProgress(95)
          setProgressText("Saving to gallery...")
          
          // Save to Vercel Blob for gallery
          let finalVideoUrl = data.video_url
          try {
            const saveRes = await fetch("/api/video/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                video_url: data.video_url,
                generation_id: data.generationId,
              }),
            })
            const saveData = await saveRes.json()
            if (saveRes.ok && saveData.permanent_url) {
              finalVideoUrl = saveData.permanent_url
            }
          } catch {
            // Continue with original URL if save fails
          }
          
          setProgress(100)
          setProgressText("Complete!")
          playSuccessSound()
          setGeneratedVideos((prev) => [
            { url: finalVideoUrl, status: "completed" } as GeneratedVideo, 
            ...prev.slice(1)
          ])
          toast.success(`Video created! Used ${data.credits_used || 15} credits.`)
          router.refresh()
          return
        }

        // Video still processing - continue polling client-side
        if (data.status === "processing" && data.taskId) {
          setProgressText("Video processing on Freepik servers...")
          toast.info("Video is being generated. Polling for completion...")
          
// Continue polling client-side - use actual type/model from server response
  // Server returns actualType and actualModelSlug based on what was actually used
  const pollType = data.actualType || (freepikModel.includes("kling") && freepikImageUrl ? "image-to-video" : "text-to-video")
  const modelSlug = data.actualModelSlug || (freepikModel.includes("1080") ? "wan-v2-6-1080p" : "wan-v2-6-720p")
  const is1080p = modelSlug.includes("1080")
  let clientPollAttempts = 0
  // Increased timeouts: WAN 1080p 8 min, others 5 min
  const maxClientPolls = is1080p ? 240 : 150 // 8 minutes for 1080p, 5 for others
  
  const pollForVideo = async () => {
  while (clientPollAttempts < maxClientPolls) {
  await new Promise(resolve => setTimeout(resolve, 2000))
  clientPollAttempts++
  
  const minutesLeft = Math.ceil((maxClientPolls - clientPollAttempts) * 2 / 60)
  setProgressText(`AI generating video... ~${minutesLeft}min remaining`)
  setProgress(Math.min(50 + (clientPollAttempts / maxClientPolls) * 45, 95))
  
  try {
  const statusRes = await fetch(`/api/video/freepik?taskId=${data.taskId}&model=${modelSlug}&type=${pollType}`)
                
                // Handle non-OK responses (500 errors, etc.) - continue polling
                if (!statusRes.ok) {
                  const mins = Math.ceil((maxClientPolls - clientPollAttempts) * 2 / 60)
                  setProgressText(`Freepik server busy, retrying... ~${mins}min left`)
                  continue
                }
                
                // Check if response is HTML (timeout error) instead of JSON
                const contentType = statusRes.headers.get("content-type")
                if (!contentType?.includes("application/json")) {
                  const mins = Math.ceil((maxClientPolls - clientPollAttempts) * 2 / 60)
                  setProgressText(`Creating video... ~${mins}min left`)
                  continue
                }
                
                const statusData = await statusRes.json()
                
                // Handle retry response from server (temporary 500 errors or 404 fallback)
                if (statusData.retry || statusData.error?.includes("not found")) {
                  const mins = Math.ceil((maxClientPolls - clientPollAttempts) * 2 / 60)
                  setProgressText(`AI processing video... ~${mins}min left`)
                  continue
                }
                
                // Handle server errors gracefully - continue polling
                if (statusData.error && !statusData.status) {
                  continue
                }
                
if (statusData.status === "COMPLETED" && statusData.video_url) {
  let finalVideoUrl = statusData.video_url
  
                // Save video to Supabase storage for permanent storage in gallery
                setProgressText("Saving to gallery...")
                try {
                const saveRes = await fetch("/api/video/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                video_url: statusData.video_url,
                generation_id: data.generationId,
                }),
                })
                const saveData = await saveRes.json()
                if (saveRes.ok && saveData.permanent_url) {
                finalVideoUrl = saveData.permanent_url
                }
                } catch {
                // If save fails, use original URL
                }
  
  // If MP3 was selected, merge it with the video
  if (audioUrlForMerge) {
  setProgressText("Adding background music...")
  setProgress(97)
  try {
  const mergeRes = await fetch("/api/video/wan22-gif", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
  merge_mode: true,
  video_url: statusData.video_url,
  mp3_url: audioUrlForMerge,
  }),
  })
  const mergeData = await mergeRes.json()
  if (mergeRes.ok && mergeData.video_url) {
  finalVideoUrl = mergeData.video_url
  
  // Save merged video to Vercel Blob for gallery
  setProgressText("Saving merged video to gallery...")
  try {
  const saveMergedRes = await fetch("/api/video/save", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
  video_url: mergeData.video_url,
  generation_id: data.generationId,
  }),
  })
  const saveMergedData = await saveMergedRes.json()
  if (saveMergedRes.ok && saveMergedData.permanent_url) {
  finalVideoUrl = saveMergedData.permanent_url
  }
  } catch {
  // Continue with merged URL if save fails
  }
  
  toast.success("Video created with background music!")
  } else {
  toast.info("Video created but audio merge failed")
  }
  } catch {
  toast.info("Video created but audio merge failed")
  }
  // Clear audio after merge attempt
  setAudioUrlForMerge("")
  setAudioFileForMerge(null)
  } else {
  toast.success("Video created successfully!")
  }
  
  clearInterval(progressInterval)
  stopSound()
  setProgress(100)
  setProgressText("Complete!")
  playSuccessSound()
  setGeneratedVideos((prev) => [
  { url: finalVideoUrl, status: "completed" } as GeneratedVideo,
  ...prev.slice(1)
  ])
  router.refresh()
  return true
  }
              } catch (pollError) {
                console.error("Polling error:", pollError)
                // Don't stop on single poll error, continue trying
              }
            }
            return false
          }
          
          const completed = await pollForVideo()
          if (!completed) {
            clearInterval(progressInterval)
            stopSound()
            setProgress(0)
            setProgressText("")
            // Give specific advice based on model
            if (is1080p) {
              toast.error("WAN 1080p is taking too long. Try WAN 720p for faster results, or try again later.")
            } else {
              toast.error("Video generation timed out. Freepik servers may be busy - please try again.")
            }
            setIsGenerating(false)
          }
          return
        }
        
        clearInterval(progressInterval)
        stopSound()
        return
      } else if (selectedProvider === "json2video") {
        // JSON2Video - merge image/video with audio
        const imageForMerge = uploadedImage || customImageUrl || vps2ImageUrl
        requestBody = {
          prompt: textInput.trim() || "Merged video with audio",
          aspectRatio,
          videoUrl: imageForMerge,
          audioUrl: customAudioUrl,
          duration: 10,
        }
      } else {
        requestBody = {
          mode: "talking",
          script: textInput.trim(),
          aspectRatio,
          provider: "d-id",
          imageUrl: imageToUse,
          voiceId: selectedVoice,
          voiceProvider: voiceInfo?.provider || "microsoft",
        }
      }

      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        clearInterval(progressInterval)
        stopSound()
        throw new Error(data.error || "Failed to generate video")
      }

      let finalVideoUrl = data.videoUrl
      
      // Merge MP3 if provided (for Hugging Face and other providers)
      if (audioUrlForMerge && finalVideoUrl) {
        setProgressText("Adding background music...")
        setProgress(95)
        try {
          const mergeRes = await fetch("/api/video/wan22-gif", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              merge_mode: true,
              video_url: finalVideoUrl,
              mp3_url: audioUrlForMerge,
            }),
          })
          const mergeData = await mergeRes.json()
          if (mergeRes.ok && mergeData.video_url) {
            finalVideoUrl = mergeData.video_url
          }
        } catch (mergeErr) {
          console.log("Audio merge failed, using original video")
        }
      }

      clearInterval(progressInterval)
      stopSound()

      setProgress(100)
      setProgressText("Complete!")
      playSuccessSound()

      // Store custom audio URL with the video for synchronized playback
      const videoResult: GeneratedVideo = { 
        url: finalVideoUrl, 
        status: "completed",
        customAudioUrl: audioUrlForMerge || (vps2AudioType === "custom" && customAudioUrl ? customAudioUrl : undefined),
      }
      
      setGeneratedVideos((prev) => [videoResult, ...prev.slice(1)])
      
      if (audioUrlForMerge) {
        toast.success("Video with music generated!")
      } else if (vps2AudioType === "custom" && customAudioUrl) {
        toast.success("Video generated! Your audio will play synchronized with the video.")
      } else {
        toast.success("Video generated successfully!")
      }
      router.refresh()
    } catch (error) {
      clearInterval(progressInterval)
      stopSound()
      playErrorSound()

      setGeneratedVideos((prev) => [{ url: null, status: "failed" }, ...prev.slice(1)])
      toast.error(error instanceof Error ? error.message : "Failed to generate video")
    } finally {
      setIsGenerating(false)
      setTimeout(() => {
        setProgress(0)
        setProgressText("")
      }, 2000)
    }
  }

const handleDownload = async (url: string, audioUrl?: string) => {
  try {
  // Download video
  toast.info("Starting video download...")
  
  const a = document.createElement("a")
  a.href = url
      a.download = `ai-video-${Date.now()}.mp4`
      a.target = "_blank"
      a.rel = "noopener noreferrer"

      if (url.includes("supabase")) {
        a.href = url + (url.includes("?") ? "&" : "?") + "download=true"
      }

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // If there's custom audio, download it separately
      if (audioUrl) {
        setTimeout(() => {
          const audioLink = document.createElement("a")
          audioLink.href = audioUrl
          audioLink.download = `ai-video-audio-${Date.now()}.mp3`
          audioLink.target = "_blank"
          audioLink.rel = "noopener noreferrer"
          document.body.appendChild(audioLink)
          audioLink.click()
          document.body.removeChild(audioLink)
          toast.success("Video and audio downloaded! Use CapCut or a video editor to merge them.")
        }, 1000)
      } else {
        toast.success("Download started!")
      }
    } catch (error) {
      console.error("Download error:", error)
      window.open(url, "_blank")
      toast.info("Video opened in new tab - right click to save")
    }
  }

// Merge video with MP3 audio using VPS API
  const handleMergeAudio = async () => {
  const audioUrl = audioUrlForMerge
  
  if (!selectedVideoForAudio || !audioUrl) {
  toast.error("Please upload or enter an MP3 file")
  return
  }
  
  setIsMergingAudio(true)
  try {
  toast.info("Merging video with audio...")
  
  // Use VPS2 gif-to-video API which can merge video + audio
  const response = await fetch("/api/video/wan22-gif", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
  merge_mode: true,
  video_url: selectedVideoForAudio,
  mp3_url: audioUrl,
  }),
  })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to merge audio")
      }

      if (data.video_url) {
        toast.success("Video merged with audio successfully!")
        setGeneratedVideos((prev) => [
          { url: data.video_url, status: "completed" } as GeneratedVideo,
          ...prev,
        ])
        setShowAddAudioDialog(false)
        setAudioUrlForMerge("")
        setAudioFileForMerge(null)
        setSelectedVideoForAudio("")
      }
    } catch (error) {
      console.error("Merge error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to merge audio")
    } finally {
      setIsMergingAudio(false)
    }
  }

  const handleShare = async (url: string, platform: string) => {
    const shareText = "Check out this AI-generated video!"

    switch (platform) {
      case "native":
        if (navigator.share) {
          try {
            await navigator.share({
              title: "AI Generated Video",
              text: shareText,
              url: url,
            })
          } catch (e) {}
        } else {
          toast.error("Sharing not supported on this device")
        }
        break
      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
          "_blank",
        )
        break
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank")
        break
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + " " + url)}`, "_blank")
        break
      case "linkedin":
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank")
        break
      case "copy":
        await navigator.clipboard.writeText(url)
        toast.success("Link copied!")
        break
    }
  }

  const ShareDropdown = ({ url }: { url: string }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="secondary" className="h-7 text-xs">
          <Share2 className="mr-1.5 h-3 w-3" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleShare(url, "native")}>
          <Share2 className="mr-2 h-4 w-4" />
          Share Video
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare(url, "twitter")}>
          <Twitter className="mr-2 h-4 w-4" />
          Twitter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare(url, "facebook")}>
          <Facebook className="mr-2 h-4 w-4" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare(url, "whatsapp")}>
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare(url, "linkedin")}>
          <Linkedin className="mr-2 h-4 w-4" />
          LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare(url, "copy")}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Status Banner */}
      {/* Updated to show status for both D-ID and VPS2 */}
      <div className="lg:col-span-2">
        {checkingApi ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Checking API status...</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {didAvailable && (
              <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 px-3 py-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-green-500">D-ID Ready</span>
              </div>
            )}
            {vps2Available && (
              <div className="flex items-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-3 py-2">
                <Server className="h-4 w-4 text-yellow-500" />
                <span className="text-xs font-medium text-yellow-500">VPS2 Ready</span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/10 px-3 py-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-blue-500">Hugging Face Free</span>
            </div>
            {!didAvailable && !vps2Available && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2">
                <Sparkles className="h-4 w-4 text-red-500" />
                <span className="text-xs font-medium text-red-500">No providers available</span>
              </div>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="h-4 w-4" />
              Generate Video
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setSoundEnabled(!soundEnabled)} className="h-7 w-7 p-0">
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider Selection - Dropdown Style */}
          <div className="space-y-2">
            <Label className="text-sm">Video Provider</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between h-auto py-3 px-4 bg-transparent"
                >
                  <div className="flex items-center gap-3">
                    {currentProvider && (
                      <>
                        <div className={`rounded-lg p-2 ${
                          currentProvider.color === "green" ? "bg-green-500/10" :
                          currentProvider.color === "purple" ? "bg-purple-500/10" :
                          currentProvider.color === "blue" ? "bg-blue-500/10" :
                          "bg-yellow-500/10"
                        }`}>
                          <currentProvider.icon className={`h-4 w-4 ${
                            currentProvider.color === "green" ? "text-green-500" :
                            currentProvider.color === "purple" ? "text-purple-500" :
                            currentProvider.color === "blue" ? "text-blue-500" :
                            "text-yellow-500"
                          }`} />
                        </div>
                        <div className="text-left">
                          <span className="font-medium text-sm block">{currentProvider.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              currentProvider.color === "green" ? "bg-green-500/10 text-green-500" :
                              currentProvider.color === "purple" ? "bg-purple-500/10 text-purple-500" :
                              currentProvider.color === "blue" ? "bg-blue-500/10 text-blue-500" :
                              "bg-yellow-500/10 text-yellow-500"
                            }`}>
                              {currentProvider.speedLabel}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {currentProvider.time}
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
                {VIDEO_PROVIDERS.map((provider, index) => {
                  const Icon = provider.icon
                  const isSelected = selectedProvider === provider.id
                  const isAvailable = provider.id === "d-id" ? didAvailable : provider.id === "huggingface" || provider.id === "freepik" ? true : vps2Available

                  return (
                    <div key={provider.id}>
                      {index > 0 && <DropdownMenuSeparator className="my-1" />}
                      <DropdownMenuItem
                        onClick={() => setSelectedProvider(provider.id)}
                        disabled={!isAvailable && profile?.role !== "admin"}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                          isSelected
                            ? "bg-primary/10 border border-primary/30"
                            : ""
                        } ${!isAvailable && profile?.role !== "admin" ? "opacity-50" : ""}`}
                      >
                        <div className={`rounded-lg p-2 ${
                          provider.color === "green" ? "bg-green-500/10" :
                          provider.color === "purple" ? "bg-purple-500/10" :
                          provider.color === "blue" ? "bg-blue-500/10" :
                          "bg-yellow-500/10"
                        }`}>
                          <Icon className={`h-4 w-4 ${
                            provider.color === "green" ? "text-green-500" :
                            provider.color === "purple" ? "text-purple-500" :
                            provider.color === "blue" ? "text-blue-500" :
                            "text-yellow-500"
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{provider.name}</span>
                            {isSelected && (
                              <CheckCircle className="h-4 w-4 text-primary ml-auto" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{provider.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              provider.color === "green" ? "bg-green-500/10 text-green-500" :
                              provider.color === "purple" ? "bg-purple-500/10 text-purple-500" :
                              provider.color === "blue" ? "bg-blue-500/10 text-blue-500" :
                              "bg-yellow-500/10 text-yellow-500"
                            }`}>
                              {provider.color === "green" ? <Zap className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                              {provider.speedLabel}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{provider.time}</span>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    </div>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* D-ID: Upload Image Section */}
          {selectedProvider === "d-id" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <ImageIcon className="h-4 w-4" />
                Upload Image (Required)
              </Label>
              <p className="text-xs text-muted-foreground">Upload a photo of a person to create a talking video</p>

              {isUploading ? (
                <div className="flex h-40 w-40 items-center justify-center rounded-xl border-2 border-primary/30 bg-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : uploadedImage ? (
                <div className="relative inline-block">
                  <div className="h-40 w-40 rounded-xl border-2 border-primary overflow-hidden bg-muted">
                    <img 
                      src={uploadedImage || "/placeholder.svg"}
                      alt="Uploaded preview"
                      loading="eager"
                      decoding="async"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget
                        target.onerror = null
                        target.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -right-2 -top-2 h-7 w-7 rounded-full p-0 shadow-lg"
                    onClick={removeUploadedImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div
                    className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-primary/50 hover:bg-muted/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Upload</span>
                  </div>
                  <Input
                    type="text"
                    placeholder="Or paste image URL..."
                    value={customImageUrl}
                    onChange={(e) => {
                      setCustomImageUrl(e.target.value)
                      setUploadedImage(null)
                    }}
                    className="flex-1"
                  />
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
          )}

          {/* Hugging Face: Optional Image Upload */}
          {selectedProvider === "huggingface" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <ImageIcon className="h-4 w-4" />
                Upload Image (Optional)
              </Label>
              <p className="text-xs text-muted-foreground">
                Upload an image to animate it, or leave empty to generate video from text only
              </p>

              {isUploading ? (
                <div className="flex h-36 w-36 items-center justify-center rounded-xl border-2 border-blue-500/30 bg-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : uploadedImage ? (
                <div className="relative inline-block">
                  <div className="h-36 w-36 rounded-xl border-2 border-blue-500 overflow-hidden bg-muted">
                    <img 
                      src={uploadedImage || "/placeholder.svg"}
                      alt="Uploaded"
                      loading="eager"
                      decoding="async"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget
                        target.onerror = null
                        target.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -right-2 -top-2 h-7 w-7 rounded-full p-0 shadow-lg"
                    onClick={removeUploadedImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div
                    className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-blue-500/50 hover:bg-blue-500/10"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mb-1 h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Upload</span>
                  </div>
                  <Input
                    type="text"
                    placeholder="Or paste image URL..."
                    value={customImageUrl}
                    onChange={(e) => {
                      setCustomImageUrl(e.target.value)
                      setUploadedImage(null)
                    }}
                    className="flex-1"
                  />
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
          )}

          {/* WAN 2.2 + GIF: Optional Image Upload */}
          {selectedProvider === "wan22-gif" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <ImageIcon className="h-4 w-4" />
                Upload Image (Optional)
              </Label>
              <p className="text-xs text-muted-foreground">
                Upload an image to animate it into a GIF, or leave empty to generate with AI
              </p>

              {isUploading ? (
                <div className="flex h-36 w-36 items-center justify-center rounded-xl border-2 border-green-500/30 bg-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                </div>
              ) : uploadedImage ? (
                <div className="relative inline-block">
                  <div className="h-36 w-36 rounded-xl border-2 border-green-500 overflow-hidden bg-muted">
                    <img 
                      src={uploadedImage || "/placeholder.svg"}
                      alt="Uploaded"
                      loading="eager"
                      decoding="async"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget
                        target.onerror = null
                        target.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -right-2 -top-2 h-7 w-7 rounded-full p-0 shadow-lg"
                    onClick={removeUploadedImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div
                    className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-green-500/50 hover:bg-green-500/10"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mb-1 h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Upload</span>
                  </div>
                  <Input
                    type="text"
                    placeholder="Or paste image URL..."
                    value={customImageUrl}
                    onChange={(e) => {
                      setCustomImageUrl(e.target.value)
                      setUploadedImage(null)
                    }}
                    className="flex-1"
                  />
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
          )}

          {/* JSON2Video - Image Upload Section */}
          {selectedProvider === "json2video" && (
            <div className="space-y-2 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
              <Label className="flex items-center gap-2 text-sm font-medium text-orange-500">
                <ImageIcon className="h-4 w-4" />
                Step 1: Upload Image or Video
              </Label>
              
              {isUploading ? (
                <div className="flex h-40 items-center justify-center rounded-xl border-2 border-orange-500/30 bg-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
              ) : (uploadedImage || customImageUrl || vps2ImageUrl) ? (
                <div className="relative">
                  <div className="h-40 w-full rounded-xl border-2 border-orange-500 overflow-hidden bg-muted">
                    <img 
                      src={uploadedImage || customImageUrl || vps2ImageUrl}
                      alt="Uploaded"
                      loading="eager"
                      decoding="async"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget
                        target.onerror = null
                        target.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2 h-7 w-7 rounded-full p-0 shadow-lg"
                    onClick={() => {
                      setUploadedImage(null)
                      setCustomImageUrl("")
                      setVps2ImageUrl("")
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-orange-500/30 p-6 hover:border-orange-500/50 hover:bg-orange-500/5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mb-2 h-8 w-8 text-orange-500" />
                  <span className="text-sm font-medium">Click to upload image</span>
                  <span className="text-xs text-muted-foreground">JPG, PNG, GIF up to 20MB</span>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
          )}
          
          {/* JSON2Video - Audio Upload Section */}
          {selectedProvider === "json2video" && (
            <div className="space-y-2 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
              <Label className="flex items-center gap-2 text-sm font-medium text-orange-500">
                <Music className="h-4 w-4" />
                Step 2: Upload Audio (MP3)
              </Label>
              
              {customAudioFile ? (
                <div className="flex items-center gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
                    <Music className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{customAudioFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(customAudioFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    onClick={removeCustomAudio}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors ${
                    isUploadingAudio
                      ? "border-orange-500/50 bg-orange-500/10"
                      : "border-orange-500/30 hover:border-orange-500/50 hover:bg-orange-500/5"
                  }`}
                  onClick={() => !isUploadingAudio && audioInputRef.current?.click()}
                >
                  {isUploadingAudio ? (
                    <>
                      <Loader2 className="mb-2 h-6 w-6 animate-spin text-orange-500" />
                      <span className="text-sm text-muted-foreground">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="mb-1 h-6 w-6 text-orange-500" />
                      <span className="text-sm font-medium">Click to upload MP3</span>
                      <span className="text-xs text-muted-foreground">Max 20MB</span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a"
                onChange={handleAudioUpload}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                Your audio will be merged with the image to create a video
              </p>
            </div>
          )}

          {/* Custom Audio Upload for GIF Mode */}
          {selectedProvider === "wan22-gif" && (
            <div className="space-y-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
              <Label className="flex items-center gap-2 text-sm">
                <Music className="h-4 w-4 text-green-500" />
                Add Background Music (Optional)
              </Label>
              
              {customAudioFile ? (
                <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                    <Music className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{customAudioFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(customAudioFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    onClick={removeCustomAudio}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors ${
                    isUploadingAudio
                      ? "border-green-500/50 bg-green-500/10"
                      : "border-muted-foreground/25 hover:border-green-500/50 hover:bg-green-500/5"
                  }`}
                  onClick={() => !isUploadingAudio && audioInputRef.current?.click()}
                >
                  {isUploadingAudio ? (
                    <>
                      <Loader2 className="mb-2 h-6 w-6 animate-spin text-green-500" />
                      <span className="text-sm text-muted-foreground">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="mb-1 h-6 w-6 text-muted-foreground" />
                      <span className="text-sm font-medium">Click to upload MP3</span>
                      <span className="text-xs text-muted-foreground">Max 20MB</span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg"
                onChange={handleAudioUpload}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                Your music will play synchronized with the GIF
              </p>
            </div>
          )}

          {/* Mode Indicator */}
          <div
            className={`rounded-lg p-3 ${
              selectedProvider === "wan22-gif"
                ? hasImage 
                  ? "bg-green-500/10 border border-green-500/30"
                  : "bg-emerald-500/10 border border-emerald-500/30"
                : selectedProvider === "vps2"
                  ? "bg-yellow-500/10 border border-yellow-500/30"
                  : selectedProvider === "huggingface"
                    ? "bg-blue-500/10 border border-blue-500/30"
                    : hasImage
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-muted/50 border border-border"
            }`}
          >
            <div className="flex items-center gap-2">
              {selectedProvider === "wan22-gif" ? (
                hasImage ? (
                  <>
                    <ImageIcon className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-500">Image to GIF Mode</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-500">Text to GIF Mode (AI Generated)</span>
                  </>
                )
              ) : selectedProvider === "vps2" ? (
                <>
                  <Server className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-500">VPS2 AI Video Mode (Free)</span>
                </>
) : selectedProvider === "huggingface" ? (
  <>
  <Zap className="h-4 w-4 text-blue-500" />
  <span className="text-sm font-medium text-blue-500">Hugging Face Video (Free)</span>
  </>
  ) : selectedProvider === "json2video" ? (
  <>
  <Film className="h-4 w-4 text-orange-500" />
  <span className="text-sm font-medium text-orange-500">Audio Merge Mode - Upload Image + Audio</span>
  </>
  ) : hasImage ? (
                <>
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Talking Video Mode</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Upload image to start</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedProvider === "wan22-gif"
                ? hasImage
                  ? "Your uploaded image will be animated into a GIF"
                  : "AI will generate an image and animate it based on your prompt"
                : selectedProvider === "vps2"
                  ? "Describe the video you want to create (Free - Your server)"
: selectedProvider === "huggingface"
  ? "Free AI video with HunyuanVideo model"
  : selectedProvider === "freepik"
  ? "Premium AI video with WAN 2.6 or Kling models"
  : selectedProvider === "json2video"
  ? "Upload an image and audio file - they will be merged into a video"
  : hasImage
  ? "Your image will speak the text below"
  : "Upload an image of a person to create a talking video"}
            </p>
          </div>

{/* Freepik Settings */}
  {selectedProvider === "freepik" && (
  <div className="space-y-4 p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
  <div className="flex items-center gap-2 mb-2">
  <Sparkles className="h-4 w-4 text-purple-500" />
  <span className="text-sm font-medium text-purple-500">Freepik AI Video Settings</span>
  </div>
  
  {/* Model Selection */}
  <div className="space-y-2">
  <Label className="text-sm">AI Model</Label>
  <Select value={freepikModel} onValueChange={setFreepikModel}>
  <SelectTrigger>
  <SelectValue placeholder="Choose model..." />
  </SelectTrigger>
  <SelectContent>
  {FREEPIK_VIDEO_MODELS.map((model) => (
  <SelectItem key={model.id} value={model.id}>
  <div className="flex flex-col">
  <span className="font-medium">{model.name}</span>
  <span className="text-xs text-muted-foreground">{model.description}</span>
  </div>
  </SelectItem>
  ))}
  </SelectContent>
  </Select>
  </div>
  
  {/* Image Upload - Optional for all models */}
  <div className="space-y-3">
  <Label className="text-sm">
  Reference Image (Optional - enhances quality)
  </Label>
  
  {freepikImageUrl ? (
  <div className="relative">
  <img src={freepikImageUrl || "/placeholder.svg"} alt="Freepik preview" className="w-full h-32 object-cover rounded-lg" />
  <Button
  size="sm"
  variant="destructive"
  onClick={removeFreepikImage}
  className="absolute top-2 right-2 h-6 w-6 p-0"
  >
  <X className="h-3 w-3" />
  </Button>
  <p className="text-xs text-green-600 mt-1">Image ready for video generation</p>
  </div>
  ) : (
  <div className="space-y-2">
  <input
  ref={freepikImageInputRef}
  type="file"
  accept="image/*"
  onChange={handleFreepikImageUpload}
  className="hidden"
  />
  <Button
  type="button"
  variant="outline"
  onClick={() => freepikImageInputRef.current?.click()}
  disabled={isUploadingFreepikImage}
  className="w-full bg-transparent"
  >
  {isUploadingFreepikImage ? (
  <>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Uploading...
  </>
  ) : (
  <>
  <Upload className="mr-2 h-4 w-4" />
  Upload Image from Device
  </>
  )}
  </Button>
  </div>
  )}
  </div>
  
  {/* Background Music - MP3 Upload */}
  <div className="space-y-3">
  <Label className="text-sm">Background Music (Optional)</Label>
  
  {audioUrlForMerge ? (
  <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
  <Music className="h-5 w-5 text-green-600 flex-shrink-0" />
  <div className="flex-1 min-w-0">
  <p className="text-sm font-medium truncate">
  {audioFileForMerge?.name || "Audio file ready"}
  </p>
  <p className="text-xs text-muted-foreground">Will be added after video generation</p>
  </div>
  <Button size="sm" variant="ghost" onClick={removeMergeAudio} className="h-8 w-8 p-0 flex-shrink-0">
  <X className="h-4 w-4" />
  </Button>
  </div>
  ) : (
  <div className="space-y-2">
  <input
  ref={mergeAudioInputRef}
  type="file"
  accept="audio/*,.mp3"
  onChange={handleMergeAudioUpload}
  className="hidden"
  />
  <Button
  type="button"
  variant="outline"
  onClick={() => mergeAudioInputRef.current?.click()}
  disabled={isUploadingMergeAudio}
  className="w-full bg-transparent"
  >
  {isUploadingMergeAudio ? (
  <>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Uploading...
  </>
  ) : (
  <>
  <Music className="mr-2 h-4 w-4" />
  Upload MP3 from Device
  </>
  )}
  </Button>
  </div>
  )}
  </div>
  
  {/* Duration Selection */}
  <div className="space-y-2">
  <Label className="text-sm">Video Duration</Label>
  <Select value={String(freepikDuration)} onValueChange={(v) => setFreepikDuration(Number(v))}>
  <SelectTrigger>
  <SelectValue placeholder="Duration..." />
  </SelectTrigger>
  <SelectContent>
  {(isFreepikI2V ? FREEPIK_KLING_DURATIONS : FREEPIK_DURATIONS).map((d) => (
  <SelectItem key={d.value} value={String(d.value)}>
  {d.label}
  </SelectItem>
  ))}
  </SelectContent>
  </Select>
  </div>
  
  {/* Face Reference Toggle - Only for Kling Image-to-Video */}
  {isFreepikI2V && freepikModel.includes("kling") && (
  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
  <div className="space-y-0.5">
  <Label className="text-sm font-medium">Face Reference</Label>
  <p className="text-xs text-muted-foreground">
  Keep face consistent from uploaded image
  </p>
  </div>
  <Switch
  checked={freepikUseFaceReference}
  onCheckedChange={setFreepikUseFaceReference}
  />
  </div>
  )}
  
  {/* WAN Face Preservation Notice */}
  {isFreepikI2V && !freepikModel.includes("kling") && (
  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
  <p className="text-xs text-amber-600 dark:text-amber-400">
  <strong>Tip:</strong> WAN models may change faces. For face preservation, use <strong>Kling</strong> model with Face Reference enabled.
  </p>
  </div>
  )}
  
  {/* Size/Aspect Ratio Selection */}
  {isFreepikI2V ? (
  <div className="space-y-2">
  <Label className="text-sm">Aspect Ratio</Label>
  <Select value={freepikAspectRatio} onValueChange={setFreepikAspectRatio}>
  <SelectTrigger>
  <SelectValue placeholder="Aspect Ratio..." />
  </SelectTrigger>
  <SelectContent>
  {FREEPIK_ASPECT_RATIOS.map((ar) => (
  <SelectItem key={ar.value} value={ar.value}>
  {ar.label}
  </SelectItem>
  ))}
  </SelectContent>
  </Select>
  </div>
  ) : (
  <div className="space-y-2">
  <Label className="text-sm">Video Size</Label>
  <Select value={freepikSize} onValueChange={setFreepikSize}>
  <SelectTrigger>
  <SelectValue placeholder="Size..." />
  </SelectTrigger>
  <SelectContent>
  {FREEPIK_SIZES.map((s) => (
  <SelectItem key={s.value} value={s.value}>
  {s.label}
  </SelectItem>
  ))}
  </SelectContent>
  </Select>
  </div>
  )}
  
{/* Negative Prompt */}
  <div className="space-y-2">
  <Label className="text-sm">Negative Prompt (Optional)</Label>
  <Textarea
  placeholder="Describe what you DON'T want in the video: blurry, low quality, watermark, text, distortion..."
  value={freepikNegativePrompt}
  onChange={(e) => setFreepikNegativePrompt(e.target.value)}
  className="min-h-[60px] text-sm resize-none"
  />
  <p className="text-xs text-muted-foreground">Things to avoid in the generated video</p>
  </div>
  
  {/* Credit Cost Info */}
  <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
  Cost: {FREEPIK_VIDEO_MODELS.find(m => m.id === freepikModel)?.credits || 15} credits |
  Your balance: {profile?.credits || 0} credits
  {isFreepikI2V && " | Image-to-Video mode"}
  </div>
  </div>
  )}
  
  {/* HF Model Selection - Only for Hugging Face */}
  {selectedProvider === "huggingface" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4" />
                Select AI Model
              </Label>
              <Select value={hfSelectedModel} onValueChange={setHfSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a model..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {HF_VIDEO_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {model.description} {model.requiresImage ? "(Image required)" : "(Text only)"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedHfModel?.requiresImage && (
                <p className="text-xs text-amber-500">
                  This model requires an image. Please upload an image above.
                </p>
              )}
            </div>
          )}

          {/* Text Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              {selectedProvider === "vps2" || selectedProvider === "huggingface" || selectedProvider === "wan22-gif" || selectedProvider === "freepik" ? "Video Prompt" : "Script (Text to Speak)"}
            </Label>
<Textarea
placeholder={
  selectedProvider === "vps2" && vps2VideoMode === "lipsync"
  ? "(Optional) Additional description for the video style"
  : selectedProvider === "vps2" && vps2VideoMode === "image"
  ? "(Optional) Describe how you want the image to move"
  : selectedProvider === "vps2" || selectedProvider === "wan22-gif"
  ? "REQUIRED: Describe your video... e.g., 'A cat walking in a garden'"
  : selectedProvider === "huggingface"
  ? "REQUIRED: Describe your video... e.g., 'A young man walking on the street'"
  : selectedProvider === "freepik"
  ? "Describe your video... e.g., 'fluffy orange cat on windowsill, looking at snow falling, soft lighting'"
  : "Enter the text you want the person in the image to speak..."
  }
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={2000}
            />
<p className="text-xs text-muted-foreground">
  {textInput.length}/2000 -{" "}
  {selectedProvider === "vps2" && vps2VideoMode === "lipsync"
  ? "Optional: style description (voice text is set above)"
  : selectedProvider === "vps2" && vps2VideoMode === "image"
  ? "Optional: describe motion or leave empty for auto animation"
  : selectedProvider === "vps2" || selectedProvider === "huggingface" || selectedProvider === "wan22-gif" || selectedProvider === "freepik"
  ? "Describe what kind of video to create"
  : "This text will be spoken by the person in your image"}
  </p>
          </div>

          {/* Voice Selection - Only for D-ID */}
          {selectedProvider === "d-id" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Mic className="h-4 w-4" />
                Voice
              </Label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DID_VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Aspect Ratio */}
          <div className="space-y-2">
            <Label className="text-sm">Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIOS.map((ratio) => (
                  <SelectItem key={ratio.id} value={ratio.id}>
                    {ratio.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* VPS2 Video Mode Selection */}
          {selectedProvider === "vps2" && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Video className="h-4 w-4" />
                Video Mode
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {VPS2_VIDEO_MODES.map((mode) => {
                  const Icon = mode.icon
                  return (
                    <Button
                      key={mode.id}
                      variant={vps2VideoMode === mode.id ? "default" : "outline"}
                      className={`flex h-auto flex-col items-center gap-1 py-3 ${
                        vps2VideoMode === mode.id 
                          ? "bg-yellow-500 text-white hover:bg-yellow-600" 
                          : "bg-transparent hover:bg-yellow-500/10"
                      }`}
                      onClick={() => setVps2VideoMode(mode.id)}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{mode.name}</span>
                    </Button>
                  )
                })}
              </div>
              
              {/* Image Upload for Image/Lipsync Mode */}
              {(vps2VideoMode === "image" || vps2VideoMode === "lipsync") && (
                <div className="space-y-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                  <Label className="flex items-center gap-2 text-sm">
                    <ImageIcon className="h-4 w-4 text-yellow-500" />
                    {vps2VideoMode === "lipsync" ? "Upload Face Image" : "Upload Image"}
                  </Label>
                  
                  {vps2ImageFile ? (
                    <div className="relative overflow-hidden rounded-lg border border-yellow-500/30">
                      <img 
                        src={vps2ImageUrl || "/placeholder.svg"} 
                        alt="Uploaded" 
                        className="w-full h-32 object-cover"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2 h-7 w-7 p-0"
                        onClick={removeVps2Image}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                        <p className="text-xs text-white truncate">{vps2ImageFile.name}</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                        isUploadingVps2Image
                          ? "border-yellow-500/50 bg-yellow-500/10"
                          : "border-muted-foreground/25 hover:border-yellow-500/50 hover:bg-yellow-500/5"
                      }`}
                      onClick={() => !isUploadingVps2Image && vps2ImageInputRef.current?.click()}
                    >
                      {isUploadingVps2Image ? (
                        <>
                          <Loader2 className="mb-2 h-8 w-8 animate-spin text-yellow-500" />
                          <span className="text-sm text-muted-foreground">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                          <span className="text-sm font-medium">Click to upload image</span>
                          <span className="text-xs text-muted-foreground">PNG, JPG up to 10MB</span>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={vps2ImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleVps2ImageUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">
                    {vps2VideoMode === "lipsync" 
                      ? "Upload a face image - it will speak your text" 
                      : "Your image will be animated with motion"}
                  </p>
                </div>
              )}
              
              {/* VPS2 Negative Prompt */}
              {vps2VideoMode === "image" && (
                <div className="space-y-2 mt-3">
                  <Label className="text-sm">Negative Prompt (Optional)</Label>
                  <Textarea
                    placeholder="Describe what you DON'T want: blurry, low quality, watermark, distortion, extra limbs..."
                    value={vps2NegativePrompt}
                    onChange={(e) => setVps2NegativePrompt(e.target.value)}
                    className="min-h-[60px] text-sm resize-none"
                  />
                  <p className="text-xs text-muted-foreground">Things to avoid in the generated video</p>
                </div>
              )}
            </div>
          )}

          {/* Lip-Sync Voice Settings */}
          {selectedProvider === "vps2" && vps2VideoMode === "lipsync" && (
            <div className="space-y-3 rounded-lg border border-purple-500/30 bg-purple-500/5 p-3">
              <Label className="flex items-center gap-2 text-sm font-medium text-purple-500">
                <Mic className="h-4 w-4" />
                Lip-Sync Voice Settings
              </Label>
              
              <div className="space-y-2">
                <Label className="text-xs">Text to Speak</Label>
                <Textarea
                  placeholder="Enter what you want the face to say..."
                  value={vps2VoiceText}
                  onChange={(e) => setVps2VoiceText(e.target.value)}
                  className="min-h-[80px] resize-none"
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground">{vps2VoiceText.length}/2000</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Language</Label>
                  <Select value={vps2VoiceLang} onValueChange={setVps2VoiceLang}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VPS2_VOICE_LANGS.map((lang) => (
                        <SelectItem key={lang.id} value={lang.id}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Voice</Label>
                  <Select value={vps2VoiceGender} onValueChange={setVps2VoiceGender}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

{/* Background Music - For VPS2 and Hugging Face */}
  {(selectedProvider === "vps2" || selectedProvider === "huggingface") && (
  <div className="space-y-3">
  <Label className="text-sm">Background Music (Optional)</Label>
  
  {audioUrlForMerge ? (
  <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
  <Music className="h-5 w-5 text-green-600 flex-shrink-0" />
  <div className="flex-1 min-w-0">
  <p className="text-sm font-medium truncate">
  {audioFileForMerge?.name || "Audio file ready"}
  </p>
  <p className="text-xs text-muted-foreground">Will be added to video</p>
  </div>
  <Button
  variant="ghost"
  size="sm"
  onClick={() => {
  setAudioUrlForMerge("")
  setAudioFileForMerge(null)
  }}
  className="h-7 w-7 p-0"
  >
  <X className="h-4 w-4" />
  </Button>
  </div>
  ) : (
  <div className="space-y-2">
  <input
  type="file"
  ref={mergeAudioInputRef}
  accept="audio/mp3,audio/mpeg,audio/wav"
  className="hidden"
  onChange={async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  setAudioFileForMerge(file)
  setIsUploadingMergeAudio(true)
  try {
  const formData = new FormData()
  formData.append("file", file)
  const res = await fetch("/api/upload", { method: "POST", body: formData })
  const data = await res.json()
  if (data.url) {
  setAudioUrlForMerge(data.url)
  toast.success("Audio uploaded!")
  }
  } catch {
  toast.error("Failed to upload audio")
  } finally {
  setIsUploadingMergeAudio(false)
  }
  }}
  />
  <Button
  variant="outline"
  size="sm"
  onClick={() => mergeAudioInputRef.current?.click()}
  disabled={isUploadingMergeAudio}
  className="w-full"
  >
  {isUploadingMergeAudio ? (
  <>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Uploading...
  </>
  ) : (
  <>
  <Upload className="mr-2 h-4 w-4" />
  Upload MP3 for Background Music
  </>
  )}
  </Button>
  </div>
  )}
  </div>
  )}
  
  {/* VPS2 Audio Options - Only for VPS2 (not lipsync mode) */}
  {selectedProvider === "vps2" && vps2VideoMode !== "lipsync" && (
  <div className="space-y-2">
  <Label className="flex items-center gap-2 text-sm">
  <Music className="h-4 w-4" />
  Audio Options
  </Label>
  <Select value={vps2AudioType} onValueChange={setVps2AudioType}>
  <SelectTrigger>
  <SelectValue />
  </SelectTrigger>
  <SelectContent>
                  {VPS2_AUDIO_TYPES.map((audioType) => (
                    <SelectItem key={audioType.id} value={audioType.id}>
                      {audioType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {vps2AudioType === "voice" && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Mic className="h-4 w-4" />
                    Voice Text
                  </Label>
                  <Textarea
                    placeholder="Enter the text for the voice narration..."
                    value={vps2VoiceText}
                    onChange={(e) => setVps2VoiceText(e.target.value)}
                    className="min-h-[80px] resize-none"
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground">
                    {vps2VoiceText.length}/2000 - This text will be narrated by the voice
                  </p>

                  <Label className="flex items-center gap-2 text-sm">
                    <Mic className="h-4 w-4" />
                    Voice Language
                  </Label>
                  <Select value={vps2VoiceLang} onValueChange={setVps2VoiceLang}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VPS2_VOICE_LANGS.map((lang) => (
                        <SelectItem key={lang.id} value={lang.id}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Label className="flex items-center gap-2 text-sm">
                    <Mic className="h-4 w-4" />
                    Voice Gender
                  </Label>
                  <Select value={vps2VoiceGender} onValueChange={setVps2VoiceGender}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VPS2_VOICE_GENDERS.map((gender) => (
                        <SelectItem key={gender.id} value={gender.id}>
                          {gender.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {vps2AudioType === "music" && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Music className="h-4 w-4" />
                    Music Style
                  </Label>
                  <Select value={vps2MusicStyle} onValueChange={setVps2MusicStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VPS2_MUSIC_STYLES.map((style) => (
                        <SelectItem key={style.id} value={style.id}>
                          {style.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Custom Audio Upload */}
              {vps2AudioType === "custom" && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm">
                    <Upload className="h-4 w-4" />
                    Upload Your MP3
                  </Label>
                  
                  {customAudioFile ? (
                    <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                        <Music className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{customAudioFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(customAudioFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        onClick={removeCustomAudio}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                        isUploadingAudio
                          ? "border-primary/50 bg-primary/5"
                          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5"
                      }`}
                      onClick={() => !isUploadingAudio && audioInputRef.current?.click()}
                    >
                      {isUploadingAudio ? (
                        <>
                          <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                          <span className="text-sm font-medium">Click to upload MP3</span>
                          <span className="text-xs text-muted-foreground">Max 20MB</span>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.ogg"
                    onChange={handleAudioUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your audio will be added to the video as background music
                  </p>
                </div>
              )}

              {/* Video Duration Selection - Only for VPS2 */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  Video Duration
                </Label>
                <Select value={vps2Duration} onValueChange={setVps2Duration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VPS2_DURATIONS.map((duration) => (
                      <SelectItem key={duration.id} value={duration.id}>
                        {duration.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Cost & Balance */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm text-muted-foreground">Cost: {CREDIT_COSTS.video} credits</span>
            <span className="text-sm text-muted-foreground">
              Balance: {profile?.role === "admin" ? "∞" : profile?.credits || 0}
            </span>
          </div>

          {/* Progress Bar */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{progressText}</span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

{/* Generate Button */}
  <Button className="w-full" onClick={handleGenerate} disabled={isGenerating || !canGenerate}>
  {isGenerating ? (
  <>
  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
  {progressText || `Generating... ${Math.round(progress)}%`}
  </>
  ) : (
  <>
  <Sparkles className="mr-2 h-4 w-4" />
  Generate {selectedProvider === "vps2" ? "AI Video" : "Talking Video"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

{/* Add Audio Dialog */}
  {showAddAudioDialog && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
  <Card className="w-full max-w-md mx-4">
  <CardHeader>
  <CardTitle className="flex items-center gap-2">
  <Music className="h-5 w-5" />
  Add MP3 to Video
  </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
  {/* File Upload Option */}
  <div className="space-y-3">
  <Label>Upload MP3 from Device</Label>
  {audioFileForMerge ? (
  <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
  <Music className="h-5 w-5 text-green-600" />
  <div className="flex-1 min-w-0">
  <p className="text-sm font-medium truncate">{audioFileForMerge.name}</p>
  <p className="text-xs text-muted-foreground">{(audioFileForMerge.size / 1024 / 1024).toFixed(2)} MB</p>
  </div>
  <Button size="sm" variant="ghost" onClick={removeMergeAudio} className="h-8 w-8 p-0">
  <X className="h-4 w-4" />
  </Button>
  </div>
  ) : (
  <>
  <input
  ref={mergeAudioInputRef}
  type="file"
  accept="audio/*,.mp3"
  onChange={handleMergeAudioUpload}
  className="hidden"
  />
  <Button
  type="button"
  variant="outline"
  onClick={() => mergeAudioInputRef.current?.click()}
  disabled={isUploadingMergeAudio}
  className="w-full bg-transparent"
  >
  {isUploadingMergeAudio ? (
  <>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Uploading...
  </>
  ) : (
  <>
  <Upload className="mr-2 h-4 w-4" />
  Choose MP3 File
  </>
  )}
  </Button>
  </>
  )}
  </div>
  
  <div className="flex gap-2">
  <Button
  variant="outline"
  onClick={() => {
  setShowAddAudioDialog(false)
  setAudioUrlForMerge("")
  setAudioFileForMerge(null)
  setSelectedVideoForAudio("")
  }}
  className="flex-1 bg-transparent"
  >
  Cancel
  </Button>
  <Button
  onClick={handleMergeAudio}
  disabled={(!audioUrlForMerge && !audioFileForMerge) || isMergingAudio}
  className="flex-1"
  >
  {isMergingAudio ? (
  <>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Merging...
  </>
  ) : (
  <>
  <Music className="mr-2 h-4 w-4" />
  Merge Audio
  </>
  )}
  </Button>
  </div>
  </CardContent>
  </Card>
  </div>
  )}
  
  {/* Generated Videos Section */}
  <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Generated Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {generatedVideos.length === 0 && generations.filter((g) => g.type === "video").length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Video className="mb-2 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No videos generated yet</p>
              </div>
            ) : (
              <>
                {generatedVideos.map((video, index) => (
                  <div key={`new-${index}`} className="overflow-hidden rounded-lg border bg-card">
                    {video.status === "generating" ? (
                      <div className="flex h-40 flex-col items-center justify-center bg-muted/50 p-4">
                        <div className="text-center w-full">
                          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          <p className="text-sm font-medium text-foreground mb-1">{progressText || "Generating..."}</p>
                          <p className="text-xs text-muted-foreground mb-2">{Math.round(progress)}% complete</p>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : video.status === "failed" ? (
                      <div className="flex h-40 items-center justify-center bg-destructive/10 p-4">
                        <p className="text-sm text-destructive">Generation failed</p>
                      </div>
                    ) : video.url ? (
                      <>
                        <video src={video.url} controls className="aspect-video w-full bg-black" />
                        <div className="flex flex-wrap gap-2 p-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownload(video.url!, video.customAudioUrl)}
                            className="h-7 flex-1 text-xs"
                          >
                            <Download className="mr-1.5 h-3 w-3" />
                            Download
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedVideoForAudio(video.url!)
                              setShowAddAudioDialog(true)
                            }}
                            className="h-7 text-xs bg-transparent"
                          >
                            <Music className="mr-1.5 h-3 w-3" />
                            Add MP3
                          </Button>
                          <ShareDropdown url={video.url} />
                        </div>
                      </>
                    ) : null}
                  </div>
                ))}
                {generations
                  .filter((g) => g.type === "video" && g.result_url)
                  .map((generation) => (
                    <div key={generation.id} className="overflow-hidden rounded-lg border bg-card">
                      {generation.result_url?.endsWith('.gif') ? (
                        <img src={generation.result_url || "/placeholder.svg"} alt="Generated GIF" className="aspect-video w-full object-contain bg-black" />
                      ) : (
                        <video src={generation.result_url} controls className="aspect-video w-full bg-black" />
                      )}
                      <div className="flex gap-2 p-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDownload(generation.result_url || "")}
                          className="h-7 flex-1 text-xs"
                        >
                          <Download className="mr-1.5 h-3 w-3" />
                          Download
                        </Button>
                        <ShareDropdown url={generation.result_url || ""} />
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
