import { ChatStudio } from "@/components/studios/chat-studio"

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chat Studio</h1>
        <p className="text-muted-foreground">Chat with AI models via OpenRouter</p>
      </div>
      <ChatStudio />
    </div>
  )
}
