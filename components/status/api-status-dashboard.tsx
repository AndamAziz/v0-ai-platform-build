"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Key,
  Copy,
  ExternalLink,
  Zap,
  ImageIcon,
  Video,
  Mic,
  MessageSquare,
  Globe,
  Database,
  Eye,
  EyeOff,
  Server,
  Save,
  AlertTriangle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ProviderStatus {
  provider: string
  displayName: string
  status: "online" | "offline" | "error" | "unknown" | "checking" | "not_configured"
  lastCheckedAt: string | null
  lastError: string | null
  responseTime: number | null
  envKey: string
  category: string
  description: string
  docsUrl: string
  icon: React.ReactNode
}

interface ApiKeyInfo {
  key: string
  name: string
  envVar: string
  isConfigured: boolean
  category: string
  description: string
  docsUrl: string
}

const API_PROVIDERS: Omit<ProviderStatus, "status" | "lastCheckedAt" | "lastError" | "responseTime">[] = [
  // AI Chat & Text
  {
    provider: "groq",
    displayName: "Groq",
    envKey: "GROQ_API_KEY",
    category: "chat",
    description: "Ultra-fast LLM inference (LLaMA 3.3, Mixtral)",
    docsUrl: "https://console.groq.com/keys",
    icon: <Zap className="h-5 w-5" />,
  },
  {
    provider: "openrouter",
    displayName: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    category: "chat",
    description: "Access to 100+ AI models (GPT-4, Claude, etc.)",
    docsUrl: "https://openrouter.ai/keys",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    provider: "openai",
    displayName: "OpenAI",
    envKey: "OPENAI_API_KEY",
    category: "chat",
    description: "GPT-4, DALL-E 3, TTS, Whisper",
    docsUrl: "https://platform.openai.com/api-keys",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    provider: "gemini",
    displayName: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    category: "chat",
    description: "Google's Gemini AI models (free tier available)",
    docsUrl: "https://aistudio.google.com/app/apikey",
    icon: <Globe className="h-5 w-5" />,
  },

  // Image Generation
  {
    provider: "huggingface",
    displayName: "HuggingFace",
    envKey: "HUGGINGFACE_API_KEY",
    category: "image",
    description: "Flux, Stable Diffusion image generation",
    docsUrl: "https://huggingface.co/settings/tokens",
    icon: <ImageIcon className="h-5 w-5" />,
  },
  {
    provider: "stability",
    displayName: "Stability AI",
    envKey: "STABILITY_API_KEY",
    category: "image",
    description: "Stable Diffusion XL, image editing",
    docsUrl: "https://platform.stability.ai/account/keys",
    icon: <ImageIcon className="h-5 w-5" />,
  },
  {
    provider: "replicate",
    displayName: "Replicate",
    envKey: "REPLICATE_API_TOKEN",
    category: "image",
    description: "Run open-source models (Flux, SDXL, etc.)",
    docsUrl: "https://replicate.com/account/api-tokens",
    icon: <ImageIcon className="h-5 w-5" />,
  },
  {
    provider: "freepik",
    displayName: "Freepik AI",
    envKey: "FREEPIK_API_KEY",
    category: "image",
    description: "Freepik Mystic AI image generation",
    docsUrl: "https://www.freepik.com/api",
    icon: <ImageIcon className="h-5 w-5" />,
  },

  // Video Generation
  {
    provider: "did",
    displayName: "D-ID",
    envKey: "DID_API_KEY",
    category: "video",
    description: "AI video generation, talking avatars",
    docsUrl: "https://studio.d-id.com/account-settings",
    icon: <Video className="h-5 w-5" />,
  },

  // Voice & TTS
  {
    provider: "elevenlabs",
    displayName: "ElevenLabs",
    envKey: "ELEVENLABS_API_KEY",
    category: "voice",
    description: "High-quality text-to-speech, voice cloning",
    docsUrl: "https://elevenlabs.io/app/settings/api-keys",
    icon: <Mic className="h-5 w-5" />,
  },
  {
    provider: "kurdish_tts",
    displayName: "Kurdish TTS",
    envKey: "KURDISH_TTS_API_KEY",
    category: "voice",
    description: "Kurdish language text-to-speech (Sorani & Kurmanji)",
    docsUrl: "https://www.kurdishtts.com",
    icon: <Mic className="h-5 w-5" />,
  },

  // VPS Servers
  {
    provider: "vps2",
    displayName: "VPS2 Server",
    envKey: "VPS2_API_KEY",
    category: "vps",
    description: "Custom VPS for Image & Video generation (image.pluschannel.co.uk)",
    docsUrl: "https://image.pluschannel.co.uk/api/info",
    icon: <Server className="h-5 w-5" />,
  },
  {
    provider: "vps",
    displayName: "VPS Server",
    envKey: "VPS_API_KEY",
    category: "vps",
    description: "Original VPS for Image generation (aim.pluschannel.co.uk)",
    docsUrl: "https://aim.pluschannel.co.uk/health",
    icon: <Server className="h-5 w-5" />,
  },

  // Database
  {
    provider: "supabase",
    displayName: "Supabase",
    envKey: "SUPABASE_URL",
    category: "database",
    description: "Database, authentication, storage",
    docsUrl: "https://supabase.com/dashboard",
    icon: <Database className="h-5 w-5" />,
  },
]

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  chat: { label: "AI Chat & Text", icon: <MessageSquare className="h-4 w-4" /> },
  image: { label: "Image Generation", icon: <ImageIcon className="h-4 w-4" /> },
  video: { label: "Video Generation", icon: <Video className="h-4 w-4" /> },
  voice: { label: "Voice & TTS", icon: <Mic className="h-4 w-4" /> },
  vps: { label: "VPS Servers", icon: <Server className="h-4 w-4" /> },
  database: { label: "Database & Storage", icon: <Database className="h-4 w-4" /> },
}

export function ApiStatusDashboard() {
  const [statuses, setStatuses] = useState<ProviderStatus[]>(
    API_PROVIDERS.map((p) => ({
      ...p,
      status: "unknown",
      lastCheckedAt: null,
      lastError: null,
      responseTime: null,
    })),
  )
  const [isChecking, setIsChecking] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<ProviderStatus | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeyValues, setApiKeyValues] = useState<Record<string, string>>({})
  const [editingApiKey, setEditingApiKey] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const { toast } = useToast()

  const checkAllStatuses = useCallback(async () => {
    setIsChecking(true)
    setStatuses((prev) => prev.map((s) => ({ ...s, status: "checking" as const })))

    try {
      const response = await fetch("/api/status/check-all")
      const data = await response.json()

      if (data.results) {
        setStatuses(
          API_PROVIDERS.map((p) => ({
            ...p,
            status: data.results[p.provider]?.status || "not_configured",
            lastCheckedAt: new Date().toISOString(),
            lastError: data.results[p.provider]?.error || null,
            responseTime: data.results[p.provider]?.responseTime || null,
          })),
        )
        const keyValues: Record<string, string> = {}
        for (const provider of API_PROVIDERS) {
          if (data.results[provider.provider]?.keyValue) {
            keyValues[provider.provider] = data.results[provider.provider].keyValue
          }
        }
        setApiKeyValues(keyValues)
      }
    } catch {
      setStatuses((prev) => prev.map((s) => ({ ...s, status: "error" as const, lastError: "Failed to check status" })))
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    checkAllStatuses()
  }, [checkAllStatuses])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      checkAllStatuses()
    }, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, checkAllStatuses])

  useEffect(() => {
    if (selectedProvider) {
      setEditingApiKey(apiKeyValues[selectedProvider.provider] || "")
    }
  }, [selectedProvider, apiKeyValues])

  const handleSaveApiKey = async () => {
    if (!selectedProvider) return

    setIsSaving(true)
    try {
      const response = await fetch("/api/status/update-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider.provider,
          envKey: selectedProvider.envKey,
          value: editingApiKey,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "API Key Updated",
          description: `${selectedProvider.displayName} API key has been updated. Status will refresh automatically.`,
        })
        setApiKeyValues((prev) => ({
          ...prev,
          [selectedProvider.provider]: editingApiKey,
        }))
        setTimeout(() => checkAllStatuses(), 1000)
      } else {
        toast({
          title: "Update Failed",
          description: data.error || "Failed to update API key",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "offline":
      case "not_configured":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "checking":
        return <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
            Online
          </Badge>
        )
      case "offline":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">
            Offline
          </Badge>
        )
      case "not_configured":
        return (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400">
            Not Configured
          </Badge>
        )
      case "error":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400">
            Error
          </Badge>
        )
      case "checking":
        return <Badge variant="secondary">Checking...</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getMaskedKey = (provider: string) => {
    const key = apiKeyValues[provider]
    if (!key) return "Not configured"
    if (key.length <= 8) return "****"
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Copied to clipboard",
    })
  }

  const categories = [...new Set(API_PROVIDERS.map((p) => p.category))]

  const onlineCount = statuses.filter((s) => s.status === "online").length
  const errorCount = statuses.filter((s) => s.status === "error" || s.status === "offline").length
  const notConfiguredCount = statuses.filter((s) => s.status === "not_configured").length

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total APIs</p>
                <p className="text-2xl font-bold">{statuses.length}</p>
              </div>
              <Key className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online</p>
                <p className="text-2xl font-bold text-green-600">{onlineCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-yellow-600">{errorCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Not Configured</p>
                <p className="text-2xl font-bold text-gray-600">{notConfiguredCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Last checked: {statuses[0]?.lastCheckedAt ? new Date(statuses[0].lastCheckedAt).toLocaleString() : "Never"}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="autoRefresh" className="text-sm text-muted-foreground">
              Auto-refresh (30s)
            </label>
          </div>
        </div>
        <Button onClick={checkAllStatuses} disabled={isChecking}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
          {isChecking ? "Checking..." : "Check All"}
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-2">
          <TabsTrigger value="all" className="text-xs">
            All APIs
          </TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="text-xs flex items-center gap-1">
              {CATEGORY_LABELS[cat]?.icon}
              {CATEGORY_LABELS[cat]?.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {statuses.map((provider) => (
              <Card
                key={provider.provider}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                onClick={() => setSelectedProvider(provider)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-muted p-2">{provider.icon}</div>
                    <CardTitle className="text-base font-medium">{provider.displayName}</CardTitle>
                  </div>
                  {getStatusIcon(provider.status)}
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-xs text-muted-foreground line-clamp-2">{provider.description}</p>
                  <div className="flex items-center justify-between">
                    {getStatusBadge(provider.status)}
                    {provider.responseTime && (
                      <span className="text-xs text-muted-foreground">{provider.responseTime}ms</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {statuses
                .filter((s) => s.category === cat)
                .map((provider) => (
                  <Card
                    key={provider.provider}
                    className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                    onClick={() => setSelectedProvider(provider)}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-muted p-2">{provider.icon}</div>
                        <CardTitle className="text-base font-medium">{provider.displayName}</CardTitle>
                      </div>
                      {getStatusIcon(provider.status)}
                    </CardHeader>
                    <CardContent>
                      <p className="mb-3 text-xs text-muted-foreground line-clamp-2">{provider.description}</p>
                      <div className="flex items-center justify-between">
                        {getStatusBadge(provider.status)}
                        {provider.responseTime && (
                          <span className="text-xs text-muted-foreground">{provider.responseTime}ms</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog
        open={!!selectedProvider}
        onOpenChange={() => {
          setSelectedProvider(null)
          setShowApiKey(false)
          setEditingApiKey("")
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">{selectedProvider?.icon}</div>
              <div>
                <DialogTitle>{selectedProvider?.displayName}</DialogTitle>
                <DialogDescription>{selectedProvider?.description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                {selectedProvider && getStatusBadge(selectedProvider.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Response Time</span>
                <span className="text-sm text-muted-foreground">
                  {selectedProvider?.responseTime ? `${selectedProvider.responseTime}ms` : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Checked</span>
                <span className="text-sm text-muted-foreground">
                  {selectedProvider?.lastCheckedAt
                    ? new Date(selectedProvider.lastCheckedAt).toLocaleString()
                    : "Never"}
                </span>
              </div>
              {selectedProvider?.lastError && (
                <div className="pt-2 border-t">
                  <span className="text-sm font-medium text-red-600">Error: </span>
                  <span className="text-sm text-red-500">{selectedProvider.lastError}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Key
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={editingApiKey}
                    onChange={(e) => setEditingApiKey(e.target.value)}
                    className="pr-10 font-mono text-sm"
                    placeholder="Enter API key..."
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {editingApiKey && (
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(editingApiKey)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {editingApiKey !== (apiKeyValues[selectedProvider?.provider || ""] || "") && (
                <Alert className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">API key changed. Click Save to update.</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Environment Variable</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">{selectedProvider?.envKey}</code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => selectedProvider && copyToClipboard(selectedProvider.envKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => window.open(selectedProvider?.docsUrl, "_blank")}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Get API Key
            </Button>
            <Button
              onClick={handleSaveApiKey}
              disabled={isSaving || editingApiKey === (apiKeyValues[selectedProvider?.provider || ""] || "")}
            >
              {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save & Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
