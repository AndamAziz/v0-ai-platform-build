"use client"

import { Label } from "@/components/ui/label"
import { Volume2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { useState } from "react"

// Define constants for audio types, voice languages, and music styles
const VPS2_AUDIO_TYPES = [
  { id: "voice", name: "Voice", icon: Volume2 },
  { id: "music", name: "Music", icon: Volume2 },
]

const VPS2_VOICE_LANGS = [
  { id: "en", name: "English" },
  { id: "es", name: "Spanish" },
  { id: "fr", name: "French" },
]

const VPS2_MUSIC_STYLES = [
  { id: "pop", name: "Pop" },
  { id: "rock", name: "Rock" },
  { id: "jazz", name: "Jazz" },
]

// This is a partial file showing the audio options UI to add in the video studio form
// Add this section after the prompt input when VPS2 is selected

const VideoStudioAudioSection = () => {
  const [selectedProvider, setSelectedProvider] = useState("")
  const [vps2AudioType, setVps2AudioType] = useState("")
  const [vps2VoiceText, setVps2VoiceText] = useState("")
  const [vps2VoiceLang, setVps2VoiceLang] = useState("")
  const [vps2MusicStyle, setVps2MusicStyle] = useState("")

  return (
    <>
      {selectedProvider === "vps2" && (
        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Volume2 className="h-4 w-4" />
            Audio Options
          </Label>

          {/* Audio Type Selection */}
          <div className="grid grid-cols-3 gap-2">
            {VPS2_AUDIO_TYPES.map((type) => {
              const Icon = type.icon
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setVps2AudioType(type.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all ${
                    vps2AudioType === type.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{type.name}</span>
                </button>
              )
            })}
          </div>

          {/* Voice Options */}
          {vps2AudioType === "voice" && (
            <div className="space-y-3">
              <div>
                <Label className="mb-1.5 text-xs text-muted-foreground">Narration Text</Label>
                <Textarea
                  value={vps2VoiceText}
                  onChange={(e) => setVps2VoiceText(e.target.value)}
                  placeholder="Enter the text to be spoken as narration..."
                  className="h-20 resize-none text-sm"
                />
              </div>
              <div>
                <Label className="mb-1.5 text-xs text-muted-foreground">Language</Label>
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
            </div>
          )}

          {/* Music Options */}
          {vps2AudioType === "music" && (
            <div>
              <Label className="mb-1.5 text-xs text-muted-foreground">Music Style</Label>
              <Select value={vps2MusicStyle} onValueChange={setVps2MusicStyle}>
                <SelectTrigger className="h-9">
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
        </div>
      )}
    </>
  )
}

export default VideoStudioAudioSection
