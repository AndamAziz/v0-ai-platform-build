"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import type { Profile, Generation } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { toast } from "sonner"
import { Loader2, Download, Mic, Play, Pause } from "lucide-react"
import { CREDIT_COSTS } from "@/lib/types"

interface VoiceStudioProps {
  profile: Profile | null
  generations: Generation[]
}

const TTS_PROVIDERS = [
  { id: "kurdish", name: "Kurdish TTS", description: "Kurdish Sorani & Kurmanji voices" },
  { id: "openai", name: "OpenAI TTS", description: "High-quality, natural voice generation" },
]

const KURDISH_VOICES = [
  { id: "sorani_214", name: "Sorani (Female)" },
  { id: "sorani_85", name: "Sorani (Male)" },
  { id: "kurmanji_12", name: "Kurmanji (Female)" },
  { id: "kurmanji_6", name: "Kurmanji (Male)" },
]

const OPENAI_VOICES = [
  { id: "alloy", name: "Alloy (Neutral)" },
  { id: "echo", name: "Echo (Male)" },
  { id: "fable", name: "Fable (British)" },
  { id: "onyx", name: "Onyx (Male, Deep)" },
  { id: "nova", name: "Nova (Female)" },
  { id: "shimmer", name: "Shimmer (Female)" },
]

export function VoiceStudio({ profile, generations }: VoiceStudioProps) {
  const [text, setText] = useState("")
  const [provider, setProvider] = useState("kurdish")
  const [voice, setVoice] = useState("sorani_214")
  const [language, setLanguage] = useState("en")
  const [speed, setSpeed] = useState([1.0])
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const router = useRouter()

  const canGenerate = profile?.role === "admin" || (profile?.credits || 0) >= CREDIT_COSTS.voice

  const currentVoices = provider === "kurdish" ? KURDISH_VOICES : OPENAI_VOICES

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider)
    if (newProvider === "kurdish") {
      setVoice("sorani_214")
    } else {
      setVoice("alloy")
    }
  }

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text")
      return
    }

    if (!canGenerate) {
      toast.error("Insufficient credits")
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          provider,
          voice,
          language,
          speed: speed[0],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate audio")
      }

      setAudioUrl(data.audioUrl)
      toast.success("Audio generated successfully!")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate audio")
    } finally {
      setIsGenerating(false)
    }
  }

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

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = `ai-voice-${Date.now()}.mp3`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
    } catch {
      toast.error("Failed to download audio")
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Generate Voice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="text">Text</Label>
            <Textarea
              id="text"
              placeholder={
                provider === "kurdish" ? "دەقەکەت لێرە بنووسە..." : "Enter the text you want to convert to speech..."
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              dir={provider === "kurdish" ? "rtl" : "ltr"}
            />
            <p className="text-xs text-muted-foreground">{text.length} characters</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={provider} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TTS_PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="voice">Voice</Label>
              <Select value={voice} onValueChange={setVoice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentVoices.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {provider === "openai" && (
            <div className="grid gap-2">
              <Label>Speed: {speed[0].toFixed(1)}x</Label>
              <Slider value={speed} onValueChange={setSpeed} min={0.25} max={4.0} step={0.25} className="mt-2" />
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <span className="text-sm text-muted-foreground">Cost: {CREDIT_COSTS.voice} credits</span>
            <span className="text-sm font-medium">
              Balance: {profile?.role === "admin" ? "Unlimited" : profile?.credits || 0}
            </span>
          </div>

          <Button className="w-full" onClick={handleGenerate} disabled={isGenerating || !canGenerate}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Generate Voice
              </>
            )}
          </Button>

          {audioUrl && (
            <div className="rounded-lg border border-border p-4">
              <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
              <div className="flex items-center gap-4">
                <Button size="icon" variant="outline" onClick={togglePlayPause} className="bg-transparent">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <div className="flex-1">
                  <p className="text-sm font-medium">Generated Audio</p>
                  <p className="text-xs text-muted-foreground">Click to preview</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleDownload(audioUrl)} className="bg-transparent">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {generations.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
              <p className="text-center text-sm text-muted-foreground">Your generated audio will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {generations
                .filter((g) => g.result_url)
                .map((gen) => (
                  <div key={gen.id} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(gen.created_at).toLocaleDateString()} • {gen.provider}
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => handleDownload(gen.result_url!)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    <audio src={gen.result_url!} controls className="w-full" />
                    {gen.prompt && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{gen.prompt}</p>}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
