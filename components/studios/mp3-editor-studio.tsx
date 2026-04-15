"use client"

import React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import type { Profile } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { toast } from "sonner"
import { 
  Loader2, 
  Download, 
  Play, 
  Pause, 
  Upload, 
  Scissors, 
  RotateCcw,
  Volume2,
  Music,
  Trash2,
  ZoomIn,
  ZoomOut
} from "lucide-react"

interface MP3EditorStudioProps {
  profile: Profile | null
}

interface AudioRegion {
  start: number
  end: number
}

export function MP3EditorStudio({ profile }: MP3EditorStudioProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState([1])
  const [isProcessing, setIsProcessing] = useState(false)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [region, setRegion] = useState<AudioRegion>({ start: 0, end: 0 })
  const [zoom, setZoom] = useState(1)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Generate waveform data from audio buffer
  const generateWaveform = useCallback((buffer: AudioBuffer) => {
    const rawData = buffer.getChannelData(0)
    const samples = 200
    const blockSize = Math.floor(rawData.length / samples)
    const filteredData: number[] = []
    
    for (let i = 0; i < samples; i++) {
      const blockStart = blockSize * i
      let sum = 0
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[blockStart + j])
      }
      filteredData.push(sum / blockSize)
    }
    
    const multiplier = Math.max(...filteredData) ** -1
    return filteredData.map(n => n * multiplier)
  }, [])

  // Draw waveform on canvas
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || waveformData.length === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const barWidth = (width / waveformData.length) * zoom
    const barGap = 1

    ctx.clearRect(0, 0, width, height)
    
    // Draw background
    ctx.fillStyle = "hsl(var(--muted))"
    ctx.fillRect(0, 0, width, height)

    // Draw selection region
    if (region.end > region.start) {
      const startX = (region.start / duration) * width * zoom
      const endX = (region.end / duration) * width * zoom
      ctx.fillStyle = "hsla(var(--primary), 0.2)"
      ctx.fillRect(startX, 0, endX - startX, height)
    }

    // Draw waveform bars
    waveformData.forEach((value, index) => {
      const x = index * barWidth
      const barHeight = value * height * 0.8
      const y = (height - barHeight) / 2

      // Check if this bar is in the selected region
      const barTime = (index / waveformData.length) * duration
      const isInRegion = barTime >= region.start && barTime <= region.end
      
      ctx.fillStyle = isInRegion ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.5)"
      ctx.fillRect(x, y, barWidth - barGap, barHeight)
    })

    // Draw playhead
    if (duration > 0) {
      const playheadX = (currentTime / duration) * width * zoom
      ctx.fillStyle = "hsl(var(--destructive))"
      ctx.fillRect(playheadX - 1, 0, 2, height)
    }
  }, [waveformData, currentTime, duration, region, zoom])

  useEffect(() => {
    drawWaveform()
  }, [drawWaveform])

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.includes("audio")) {
      toast.error("Please upload an audio file (MP3, WAV, etc.)")
      return
    }

    setAudioFile(file)
    const url = URL.createObjectURL(file)
    setAudioUrl(url)

    // Create audio context and decode audio for waveform
    try {
      const arrayBuffer = await file.arrayBuffer()
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }
      
      const buffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      setAudioBuffer(buffer)
      setDuration(buffer.duration)
      setRegion({ start: 0, end: buffer.duration })
      
      const waveform = generateWaveform(buffer)
      setWaveformData(waveform)
      
      toast.success("Audio loaded successfully!")
    } catch {
      toast.error("Failed to process audio file")
    }
  }

  // Handle audio events
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
      setRegion({ start: 0, end: audioRef.current.duration })
    }
  }

  // Playback controls
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value)
    if (audioRef.current) {
      audioRef.current.volume = value[0]
    }
  }

  // Seek to position
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !audioRef.current) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / (rect.width * zoom)
    const newTime = percentage * duration
    
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  // Set region start/end
  const setRegionStart = () => {
    setRegion(prev => ({ ...prev, start: currentTime }))
    toast.success(`Start point set at ${formatTime(currentTime)}`)
  }

  const setRegionEnd = () => {
    setRegion(prev => ({ ...prev, end: currentTime }))
    toast.success(`End point set at ${formatTime(currentTime)}`)
  }

  // Cut/trim audio
  const handleCutAudio = async () => {
    if (!audioBuffer || region.start >= region.end) {
      toast.error("Please select a valid region to cut")
      return
    }

    setIsProcessing(true)
    try {
      const audioContext = audioContextRef.current || new AudioContext()
      const sampleRate = audioBuffer.sampleRate
      const startSample = Math.floor(region.start * sampleRate)
      const endSample = Math.floor(region.end * sampleRate)
      const newLength = endSample - startSample

      // Create new buffer for trimmed audio
      const newBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        newLength,
        sampleRate
      )

      // Copy selected region to new buffer
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const oldData = audioBuffer.getChannelData(channel)
        const newData = newBuffer.getChannelData(channel)
        for (let i = 0; i < newLength; i++) {
          newData[i] = oldData[startSample + i]
        }
      }

      // Convert buffer to WAV blob
      const wavBlob = bufferToWav(newBuffer)
      const newUrl = URL.createObjectURL(wavBlob)
      
      // Update state
      setAudioBuffer(newBuffer)
      setAudioUrl(newUrl)
      setDuration(newBuffer.duration)
      setRegion({ start: 0, end: newBuffer.duration })
      setCurrentTime(0)
      
      const waveform = generateWaveform(newBuffer)
      setWaveformData(waveform)

      toast.success(`Audio trimmed to ${formatTime(region.end - region.start)}`)
    } catch {
      toast.error("Failed to cut audio")
    } finally {
      setIsProcessing(false)
    }
  }

  // Convert AudioBuffer to WAV Blob
  const bufferToWav = (buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const format = 1 // PCM
    const bitDepth = 16

    const bytesPerSample = bitDepth / 8
    const blockAlign = numChannels * bytesPerSample

    const wavDataBytes = buffer.length * numChannels * bytesPerSample
    const headerBytes = 44
    const totalBytes = headerBytes + wavDataBytes

    const arrayBuffer = new ArrayBuffer(totalBytes)
    const view = new DataView(arrayBuffer)

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i))
      }
    }

    writeString(0, "RIFF")
    view.setUint32(4, totalBytes - 8, true)
    writeString(8, "WAVE")
    writeString(12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, format, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitDepth, true)
    writeString(36, "data")
    view.setUint32(40, wavDataBytes, true)

    // Audio data
    let offset = 44
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
        view.setInt16(offset, intSample, true)
        offset += 2
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" })
  }

  // Download processed audio
  const handleDownload = () => {
    if (!audioBuffer) return

    const wavBlob = bufferToWav(audioBuffer)
    const url = URL.createObjectURL(wavBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `edited-audio-${Date.now()}.wav`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success("Audio downloaded!")
  }

  // Reset everything
  const handleReset = () => {
    setAudioFile(null)
    setAudioUrl(null)
    setAudioBuffer(null)
    setWaveformData([])
    setDuration(0)
    setCurrentTime(0)
    setRegion({ start: 0, end: 0 })
    setIsPlaying(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            MP3 Editor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Section */}
          {!audioUrl ? (
            <div 
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12 cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Upload Audio File</p>
              <p className="text-sm text-muted-foreground">MP3, WAV, OGG, M4A supported</p>
              <Input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : (
            <>
              {/* Audio Element */}
              <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              {/* File Info */}
              <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                <div className="flex items-center gap-3">
                  <Music className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{audioFile?.name || "Audio File"}</p>
                    <p className="text-xs text-muted-foreground">
                      Duration: {formatTime(duration)}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={handleReset}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Waveform Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Waveform</Label>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" onClick={() => setZoom(Math.max(0.5, zoom - 0.5))} className="bg-transparent h-8 w-8">
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">{zoom}x</span>
                    <Button size="icon" variant="outline" onClick={() => setZoom(Math.min(4, zoom + 0.5))} className="bg-transparent h-8 w-8">
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={120}
                    onClick={handleCanvasClick}
                    className="cursor-crosshair"
                    style={{ width: `${800 * zoom}px`, height: "120px" }}
                  />
                </div>
              </div>

              {/* Time Display */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono">{formatTime(currentTime)}</span>
                <span className="text-muted-foreground font-mono">{formatTime(duration)}</span>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  size="lg"
                  onClick={togglePlayPause}
                  className="h-14 w-14 rounded-full"
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                </Button>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-4">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={volume}
                  onValueChange={handleVolumeChange}
                  max={1}
                  step={0.1}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-12">{Math.round(volume[0] * 100)}%</span>
              </div>

              {/* Region Selection */}
              <div className="space-y-3">
                <Label>Selection Region</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Start</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={formatTime(region.start)}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button size="sm" variant="outline" onClick={setRegionStart} className="bg-transparent">
                        Set
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">End</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={formatTime(region.end)}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button size="sm" variant="outline" onClick={setRegionEnd} className="bg-transparent">
                        Set
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: {formatTime(region.end - region.start)} | 
                  Click on waveform to seek, use Set buttons to mark start/end points
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleCutAudio}
                  disabled={isProcessing || region.start >= region.end}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Scissors className="mr-2 h-4 w-4" />
                  )}
                  Cut Selection
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={!audioBuffer}
                  className="flex-1 bg-transparent"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="bg-transparent"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
            <p>Upload an audio file (MP3, WAV, OGG, or M4A)</p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
            <p>Click on the waveform to seek to any position</p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">3</span>
            <p>Set start and end points to select the region you want to keep</p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">4</span>
            <p>Click "Cut Selection" to trim the audio to your selection</p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">5</span>
            <p>Download the edited audio file</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
