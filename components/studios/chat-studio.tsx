"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Send,
  Loader2,
  Trash2,
  Bot,
  User,
  Copy,
  Check,
  Settings,
  X,
  Sparkles,
  Zap,
  ImagePlus,
  RefreshCw,
  Download,
  Clock,
  MessageSquarePlus,
  Menu,
  History,
  MoreVertical,
  AlertCircle,
  Coins,
} from "lucide-react"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface MessageContent {
  type: "text" | "image_url"
  text?: string
  image_url?: { url: string }
}

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string | MessageContent[]
  timestamp: Date
  responseTime?: number
  imageUrl?: string
  tokenUsage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  model: string
}

const MODELS = [
  {
    id: "sambanova/Meta-Llama-3.3-70B-Instruct",
    name: "Llama 3.3 70B (SambaNova)",
    provider: "SambaNova",
    free: true,
    fast: true,
    vision: false,
  },
  {
    id: "sambanova/DeepSeek-R1-Distill-Llama-70B",
    name: "DeepSeek R1 70B",
    provider: "SambaNova",
    free: true,
    fast: true,
    vision: false,
  },
  {
    id: "sambanova/Qwen2.5-72B-Instruct",
    name: "Qwen 2.5 72B",
    provider: "SambaNova",
    free: true,
    fast: true,
    vision: false,
  },
  {
    id: "sambanova/QwQ-32B",
    name: "QwQ 32B (Reasoning)",
    provider: "SambaNova",
    free: true,
    fast: true,
    vision: false,
  },
  {
    id: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    provider: "Groq",
    free: true,
    fast: true,
    vision: false,
  },
  {
    id: "groq/llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    provider: "Groq",
    free: true,
    fast: true,
    vision: false,
  },
  { id: "groq/llama-3.1-8b-instant", name: "Llama 3.1 8B", provider: "Groq", free: true, fast: true, vision: false },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", free: false, fast: false, vision: true },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", free: false, fast: true, vision: true },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    free: false,
    fast: false,
    vision: true,
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    free: true,
    fast: true,
    vision: true,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
    provider: "Meta",
    free: true,
    fast: false,
    vision: false,
  },
]

const DEFAULT_SYSTEM_PROMPT = `You are a highly capable, creative, and friendly AI assistant. You're designed to be helpful while maintaining a professional yet warm conversational tone.

**Language Support:**
- You understand and respond fluently in English, Kurdish (Sorani & Kurmanji), Arabic, Persian, Turkish, and more
- "slaw" or "sllaw" means "hello" in Kurdish - respond with a warm greeting
- Always respond in the same language the user writes in

**Capabilities:**
- Technical questions: web development, coding (JavaScript, Python, etc.), VPS setup, Telegram bots, APIs
- Creative tasks: writing, brainstorming, storytelling
- Image analysis: When images are provided, describe and analyze them in detail
- Problem solving: debugging code, explaining concepts, finding solutions

**Guidelines:**
- Be creative and think outside the box when needed
- Provide detailed explanations when asked
- Use code blocks with syntax highlighting for code examples
- Be concise for simple questions, detailed for complex ones
- Remember context from our conversation
- Ask clarifying questions if the request is ambiguous`

const generateId = () => Math.random().toString(36).substring(2, 15)

const getErrorMessage = (status: number, errorText?: string): string => {
  switch (status) {
    case 401:
      return "Please log in to continue chatting."
    case 402:
      return "You don't have enough credits. Get more credits to continue."
    case 404:
      return "This model is not available. Please try another one."
    case 429:
      return "Too many requests. Please wait a moment and try again."
    case 500:
      return "Something went wrong on our end. Please try again."
    default:
      return errorText || "An unexpected error occurred. Please try again."
  }
}

export function ChatStudio() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null)
  const [model, setModel] = useState("groq/llama-3.3-70b-versatile")
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(2048)
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  useEffect(() => {
    if (conversations.length === 0) {
      createNewConversation()
    }
  }, [])

  const currentModel = MODELS.find((m) => m.id === model)

  const createNewConversation = () => {
    const newConv: Conversation = {
      id: generateId(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      model: model,
    }
    setConversations((prev) => [newConv, ...prev])
    setCurrentConversationId(newConv.id)
    setMessages([])
    setInput("")
    setUploadedImage(null)
    setImagePreview(null)
  }

  const switchConversation = (convId: string) => {
    if (currentConversationId) {
      setConversations((prev) => prev.map((c) => (c.id === currentConversationId ? { ...c, messages } : c)))
    }
    const conv = conversations.find((c) => c.id === convId)
    if (conv) {
      setCurrentConversationId(convId)
      setMessages(conv.messages)
      setModel(conv.model)
    }
    setShowSidebar(false)
  }

  const deleteConversation = (convId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId))
    if (currentConversationId === convId) {
      const remaining = conversations.filter((c) => c.id !== convId)
      if (remaining.length > 0) {
        switchConversation(remaining[0].id)
      } else {
        createNewConversation()
      }
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setUploadedImage(base64)
      setImagePreview(base64)
    }
    reader.readAsDataURL(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeImage = () => {
    setUploadedImage(null)
    setImagePreview(null)
  }

  const handleSend = async (retryCount = 0) => {
    if ((!input.trim() && !uploadedImage) || isLoading) return
    if (uploadedImage && !currentModel?.vision) {
      toast.error(`${currentModel?.name} doesn't support images. Please select GPT-4o, Claude 3.5, or Gemini.`)
      return
    }

    const messageId = generateId()
    const userMessage: Message = {
      id: messageId,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
      imageUrl: uploadedImage || undefined,
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)

    if (messages.length === 0 && input.trim()) {
      const title = input.trim().slice(0, 30) + (input.length > 30 ? "..." : "")
      setConversations((prev) => prev.map((c) => (c.id === currentConversationId ? { ...c, title } : c)))
    }

    setInput("")
    const sentImage = uploadedImage
    setUploadedImage(null)
    setImagePreview(null)
    setIsLoading(true)

    const startTime = Date.now()

    try {
      const contextMessages = newMessages.slice(-10).map((msg) => {
        if (msg.imageUrl && currentModel?.vision) {
          return {
            role: msg.role,
            content: [
              { type: "text", text: typeof msg.content === "string" ? msg.content : "What's in this image?" },
              { type: "image_url", image_url: { url: msg.imageUrl } },
            ],
          }
        }
        return {
          role: msg.role,
          content:
            typeof msg.content === "string" ? msg.content : msg.content.find((c) => c.type === "text")?.text || "",
        }
      })

      const response = await fetch("/api/chat/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: [{ role: "system", content: systemPrompt }, ...contextMessages],
          model,
          temperature,
          maxTokens,
        }),
      })

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status >= 500 && retryCount === 0) {
          setMessages(messages)
          if (sentImage) {
            setUploadedImage(sentImage)
            setImagePreview(sentImage)
          }
          setInput(userMessage.content as string)
          setIsLoading(false)
          toast.info("Retrying...")
          setTimeout(() => handleSend(1), 1000)
          return
        }
        const errorMessage = getErrorMessage(response.status, errorData.error)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        responseTime,
        tokenUsage: data.usage,
        imageUrl: data.imageUrl, // Add image URL if generated
      }

      const updatedMessages = [...newMessages, assistantMessage]
      setMessages(updatedMessages)
      setConversations((prev) =>
        prev.map((c) => (c.id === currentConversationId ? { ...c, messages: updatedMessages } : c)),
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate response"
      toast.error(errorMessage, { icon: <AlertCircle className="h-4 w-4" />, duration: 5000 })
      setMessages(messages)
      if (sentImage) {
        setUploadedImage(sentImage)
        setImagePreview(sentImage)
      }
      setInput(userMessage.content as string)
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const regenerateLastResponse = async () => {
    if (messages.length < 2 || isLoading) return
    const lastUserIndex = messages.map((m) => m.role).lastIndexOf("user")
    if (lastUserIndex === -1) return
    const lastUserMsg = messages[lastUserIndex]
    const messagesBeforeUser = messages.slice(0, lastUserIndex)
    setMessages(messagesBeforeUser)
    setInput(typeof lastUserMsg.content === "string" ? lastUserMsg.content : "")
    if (lastUserMsg.imageUrl) {
      setUploadedImage(lastUserMsg.imageUrl)
      setImagePreview(lastUserMsg.imageUrl)
    }
    setTimeout(() => handleSend(), 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearChat = () => {
    setMessages([])
    setConversations((prev) => prev.map((c) => (c.id === currentConversationId ? { ...c, messages: [] } : c)))
    toast.success("Chat cleared")
  }

  const copyMessage = async (content: string | MessageContent[], id: string) => {
    const text = typeof content === "string" ? content : content.find((c) => c.type === "text")?.text || ""
    await navigator.clipboard.writeText(text)
    setCopiedIndex(id)
    setTimeout(() => setCopiedIndex(null), 2000)
    toast.success("Copied!")
  }

  const exportChat = () => {
    const text = messages
      .map((m) => {
        const content = typeof m.content === "string" ? m.content : m.content.find((c) => c.type === "text")?.text || ""
        return `[${m.role.toUpperCase()}] ${formatTime(m.timestamp)}\n${content}\n`
      })
      .join("\n---\n\n")
    const blob = new Blob([text], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `chat-${new Date().toISOString().split("T")[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Chat exported!")
  }

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const formatDate = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return "Today"
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
    return date.toLocaleDateString()
  }
const getMessageText = (content: string | MessageContent[]) =>
  typeof content === "string" ? content : content.find((c) => c.type === "text")?.text || ""

// Parse message content and render images properly
const renderMessageContent = (content: string | MessageContent[]) => {
  const text = getMessageText(content)
  
  // Split by markdown image pattern: ![alt](url)
  const parts = text.split(/(!?\[.*?\]\(.*?\))/g)
  
  return parts.map((part, index) => {
    // Check if this part is a markdown image
    const imageMatch = part.match(/!\[(.*?)\]\((.*?)\)/)
    if (imageMatch) {
      const [, alt, url] = imageMatch
      return (
        <img
          key={index}
          src={url || "/placeholder.svg"}
          alt={alt || "Generated Image"}
          className="max-w-full sm:max-w-[280px] md:max-w-[350px] max-h-64 rounded-xl object-contain my-2 shadow-sm"
          loading="lazy"
        />
      )
    }
    
    // Check if this part is a regular link [text](url) - don't render as image
    const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/)
    if (linkMatch && !part.startsWith("!")) {
      const [, linkText, url] = linkMatch
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline break-all"
        >
          {linkText}
        </a>
      )
    }
    
    // Regular text
    return part ? <span key={index}>{part}</span> : null
  })
}

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-background rounded-xl border shadow-sm overflow-hidden">
      {/* Sidebar Overlay for mobile */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* Sidebar - 240px width, collapsible */}
      <div
        className={`
        ${showSidebar ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 fixed lg:relative inset-y-0 left-0 z-40
        w-60 border-r bg-background flex flex-col
        transition-transform duration-300 ease-in-out
      `}
      >
        <div className="h-14 px-3 border-b flex items-center justify-between flex-shrink-0">
          <h3 className="font-semibold text-sm">Chats</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={createNewConversation}>
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm transition-colors hover:bg-muted ${currentConversationId === conv.id ? "bg-muted" : ""}`}
              onClick={() => switchConversation(conv.id)}
            >
              <History className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-xs">{conv.title}</p>
                <p className="text-[10px] text-muted-foreground">{formatDate(conv.createdAt)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteConversation(conv.id)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - 56px height */}
        <div className="h-14 flex items-center justify-between px-3 border-b bg-background flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <Menu className="h-4 w-4" />
            </Button>

            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground text-xs">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <h2 className="font-semibold text-sm">AI Assistant</h2>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                {currentModel?.free && <span className="text-green-500">Free</span>}
                {currentModel?.fast && <Zap className="h-2.5 w-2.5 text-yellow-500" />}
                {currentModel?.vision && <ImagePlus className="h-2.5 w-2.5 text-blue-500" />}
                <span className="truncate">{currentModel?.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={createNewConversation}>
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${showSettings ? "bg-muted" : ""}`}
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportChat} disabled={messages.length === 0}>
                  <Download className="h-4 w-4 mr-2" /> Export
                </DropdownMenuItem>
                <DropdownMenuItem onClick={clearChat} disabled={messages.length === 0} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Clear
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="border-b bg-muted/50 p-3 space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-xs">Settings</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSettings(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        <div className="flex items-center gap-1">
                          <span>{m.name}</span>
                          {m.free && (
                            <span className="text-[9px] bg-green-500/20 text-green-600 px-1 rounded">Free</span>
                          )}
                          {m.vision && <ImagePlus className="h-2.5 w-2.5 text-blue-500" />}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Temperature: {temperature}</Label>
                <Slider value={[temperature]} onValueChange={([v]) => setTemperature(v)} min={0} max={1} step={0.1} />
              </div>
            </div>
          </div>
        )}

        {/* Messages Area - Takes remaining space, scrollable */}
        <div className="flex-1 overflow-y-auto px-2 py-3 sm:p-4 md:p-6 bg-gradient-to-b from-muted/20 to-background">
          <div className="space-y-3 sm:space-y-4 md:space-y-6 max-w-4xl mx-auto pb-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full min-h-[250px] sm:min-h-[300px] text-center p-4 sm:p-6">
                <div className="p-3 sm:p-4 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 mb-3 sm:mb-4">
                  <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">Start a conversation</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xs sm:max-w-md">
                  Ask me anything! I can help with coding, creative writing, analysis, and more.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-2 sm:gap-3 md:gap-4 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 flex-shrink-0 shadow-sm">
                  <AvatarFallback className={message.role === "assistant" 
                    ? "bg-gradient-to-br from-primary to-purple-600 text-primary-foreground" 
                    : "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
                  }>
                    {message.role === "assistant" ? <Bot className="h-3 w-3 sm:h-4 sm:w-4" /> : <User className="h-3 w-3 sm:h-4 sm:w-4" />}
                  </AvatarFallback>
                </Avatar>

                <div
                  className={`relative max-w-[calc(100%-44px)] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[70%] rounded-xl sm:rounded-2xl ${
                    message.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-tr-sm" 
                      : "bg-card border border-border/40 rounded-tl-sm shadow-sm"
                  }`}
                >
                  <div className="px-3 py-2 sm:px-4 sm:py-3 md:px-5 md:py-4">
                    {message.imageUrl && (
                      <img
                        src={message.imageUrl || "/placeholder.svg"}
                        alt="Uploaded"
                        className="max-w-full sm:max-w-[200px] md:max-w-[300px] max-h-40 sm:max-h-48 rounded-lg object-contain mb-2"
                      />
                    )}
                    <div className="text-[13px] sm:text-sm md:text-base whitespace-pre-wrap break-words leading-relaxed overflow-hidden">
                      {renderMessageContent(message.content)}
                    </div>
                  </div>
                  
                  <div
                    className={`flex items-center justify-between gap-2 px-3 py-1.5 sm:px-4 sm:py-2 border-t ${
                      message.role === "user" 
                        ? "border-primary-foreground/10 text-primary-foreground/60" 
                        : "border-border/30 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px]">
                      <span>{formatTime(message.timestamp)}</span>
                      {message.responseTime && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {(message.responseTime / 1000).toFixed(1)}s
                        </span>
                      )}
                      {message.tokenUsage && (
                        <span className="hidden sm:flex items-center gap-0.5">
                          <Coins className="h-2.5 w-2.5" />
                          {message.tokenUsage.total_tokens}
                        </span>
                      )}
                    </div>
                    
                    {message.role === "assistant" && (
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 sm:h-7 sm:w-7 hover:bg-muted/50 rounded-md"
                          onClick={() => copyMessage(message.content, message.id)}
                        >
                          {copiedIndex === message.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 sm:h-7 sm:w-7 hover:bg-muted/50 rounded-md"
                          onClick={regenerateLastResponse}
                          disabled={isLoading}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-2 sm:gap-3">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground">
                    <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-card border border-border/40 rounded-xl rounded-tl-sm px-3 py-2 sm:px-4 sm:py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-primary" />
                    <span className="text-xs sm:text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="border-t bg-background p-2 sm:p-3 md:p-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            {imagePreview && (
              <div className="mb-2 relative inline-block">
                <img src={imagePreview || "/placeholder.svg"} alt="Preview" className="max-h-12 sm:max-h-16 rounded-lg" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full"
                  onClick={removeImage}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            )}

            <div className="flex items-end gap-1.5 sm:gap-2 md:gap-3">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <Button
                variant="outline"
                size="icon"
                className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 bg-transparent rounded-lg sm:rounded-xl border hover:bg-muted"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                title={currentModel?.vision ? "Upload image" : "Select a vision model"}
              >
                <ImagePlus className={`h-4 w-4 sm:h-5 sm:w-5 ${currentModel?.vision ? "" : "opacity-50"}`} />
              </Button>

              <div className="flex-1 relative">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="min-h-[38px] sm:min-h-[42px] md:min-h-[46px] max-h-32 resize-none text-[13px] sm:text-sm md:text-base rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 pr-11 sm:pr-12 border focus:border-primary/50"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && !uploadedImage) || isLoading}
                  className="absolute right-1.5 bottom-1.5 sm:right-2 sm:bottom-2 h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 rounded-md sm:rounded-lg"
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
