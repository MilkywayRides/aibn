"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { PromptToolbar } from "@/components/ai/prompt-toolbar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AI_CONFIG } from "@/lib/ai-config"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { IconArrowUp, IconMicrophone, IconHistory, IconSearch, IconPlus, IconSparkles, IconPlayerPause } from "@tabler/icons-react"
import { useState } from "react"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"

export default function Home() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
  const [input, setInput] = useState("")
  const [historyOpen, setHistoryOpen] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const handleSubmit = async () => {
    if (!input.trim() || isStreaming) return
    
    const userMessage = { role: "user" as const, content: input }
    const userInput = input
    setMessages([...messages, userMessage])
    setInput("")
    setIsStreaming(true)

    const assistantMessage = { role: "assistant" as const, content: "" }
    setMessages(prev => [...prev, assistantMessage])

    const controller = new AbortController()
    setAbortController(controller)

    try {
      const response = await fetch(AI_CONFIG.modelUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const contentType = response.headers.get("content-type")
      console.log("Content-Type:", contentType)
      
      if (contentType?.includes("text/event-stream")) {
        console.log("Using streaming mode")
        const reader = response.body?.getReader()
        if (!reader) throw new Error("No reader available")

        const decoder = new TextDecoder()
        let buffer = ""
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ""
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              try {
                const json = JSON.parse(data)
                if (json.content) {
                  setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1].content += json.content
                    return updated
                  })
                }
              } catch {}
            }
          }
        }
      } else {
        console.log("Using non-streaming mode")
        const data = await response.json()
        console.log("Response data:", data)
        const content = data.content || data.response || "No response"
        console.log("Setting content:", content)
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1].content = content
          return updated
        })
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1].content += " [Stopped]"
          return updated
        })
      } else {
        console.error("Error:", error)
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1].content = `Error: ${error instanceof Error ? error.message : "Failed to connect"}`
          return updated
        })
      }
    } finally {
      setIsStreaming(false)
      setAbortController(null)
    }
  }

  const handleStop = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        {messages.length > 0 ? (
          // Chat View
          <div className="flex flex-col h-full animate-in fade-in duration-500">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-2 rounded-br-lg flex items-center justify-between">
              <SidebarTrigger className="rounded-lg" />
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="rounded-lg" onClick={() => setMessages([])}>
                  <IconPlus className="h-5 w-5" />
                </Button>
                <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="rounded-lg">
                      <IconHistory className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Chat History</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search conversations..." className="pl-9" />
              </div>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pr-4">
                  <div className="group p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium leading-none">How to implement authentication in Next.js?</p>
                        <p className="text-xs text-muted-foreground">Discussed NextAuth.js setup and configuration</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">2h ago</span>
                    </div>
                  </div>
                  <div className="group p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium leading-none">React state management best practices</p>
                        <p className="text-xs text-muted-foreground">Compared Redux, Zustand, and Context API</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Yesterday</span>
                    </div>
                  </div>
                  <div className="group p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium leading-none">Database schema design for e-commerce</p>
                        <p className="text-xs text-muted-foreground">Discussed tables, relationships, and indexing</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">2 days ago</span>
                    </div>
                  </div>
                  <div className="group p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium leading-none">Optimizing React performance</p>
                        <p className="text-xs text-muted-foreground">Memoization, lazy loading, and code splitting</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">3 days ago</span>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pb-32">
              <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
                {messages.map((message, index) => {
                  const isLastMessage = index === messages.length - 1
                  const showShimmer = isLastMessage && message.role === "assistant" && isStreaming
                  
                  return (
                    <div key={index} className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      {message.role === "assistant" && (
                        <div className="flex-shrink-0 w-7 h-7 rounded-sm bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                          AI
                        </div>
                      )}
                      <div className="flex-1 max-w-[85%]">
                        {message.role === "assistant" && (
                          <div className="text-sm font-semibold mb-2">Aibn-v1</div>
                        )}
                        <div className={message.role === "user" ? "ml-auto max-w-fit" : ""}>
                          {message.role === "user" ? (
                            <div className="bg-muted rounded-3xl px-5 py-3 inline-block">
                              <p className="text-[15px] leading-relaxed">{message.content}</p>
                            </div>
                          ) : showShimmer ? (
                            <AnimatedShinyText className="text-[15px] leading-7">
                              {message.content || "Thinking..."}
                            </AnimatedShinyText>
                          ) : (
                            <p className="text-[15px] leading-7 text-foreground/90">{message.content || "Thinking..."}</p>
                          )}
                        </div>
                      </div>
                      {message.role === "user" && (
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                          U
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 pointer-events-none" style={{ left: 'var(--sidebar-width, 0px)' }}>
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent h-32" />
              <div className="relative max-w-3xl mx-auto p-4 pointer-events-auto">
                <div className="flex flex-col gap-2 rounded-3xl border border-border/30 bg-muted/50 backdrop-blur-2xl p-3 shadow-2xl shadow-black/20">
                  <PromptToolbar />

                  <div className="flex items-end gap-2 px-3 pb-1">
                    <Textarea 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Message" 
                      className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/60 min-h-[52px] max-h-[200px] resize-none"
                      rows={1}
                    />
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full hover:bg-accent/50">
                        <IconMicrophone className="h-5 w-5" />
                      </Button>
                      {isStreaming ? (
                        <Button onClick={handleStop} size="icon" variant="destructive" className="h-9 w-9 rounded-full shadow-sm">
                          <IconPlayerPause className="h-5 w-5" />
                        </Button>
                      ) : (
                        <Button onClick={handleSubmit} size="icon" className="h-9 w-9 rounded-full shadow-sm">
                          <IconArrowUp className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Welcome View
          <div className="flex flex-col min-h-screen animate-in fade-in duration-500">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-2 rounded-br-lg">
              <SidebarTrigger className="rounded-lg" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <div className="w-full max-w-3xl space-y-8">
              <div className="text-center space-y-2">
                <h1 className="text-5xl font-semibold tracking-tight">
                  What can I help with?
                </h1>
              </div>

              <div className="relative">
                <div className="flex flex-col gap-2 rounded-3xl border border-border/30 bg-muted/50 backdrop-blur-2xl p-3 shadow-2xl shadow-black/20 transition-all focus-within:shadow-2xl focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10">
                  <PromptToolbar />

                  <div className="flex items-end gap-2 px-3 pb-1">
                    <Textarea 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Message" 
                      className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/60 min-h-[52px] max-h-[200px] resize-none"
                      rows={1}
                    />
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full hover:bg-accent/50">
                        <IconMicrophone className="h-5 w-5" />
                      </Button>
                      {isStreaming ? (
                        <Button onClick={handleStop} size="icon" variant="destructive" className="h-9 w-9 rounded-full shadow-sm">
                          <IconPlayerPause className="h-5 w-5" />
                        </Button>
                      ) : (
                        <Button onClick={handleSubmit} size="icon" className="h-9 w-9 rounded-full shadow-sm">
                          <IconArrowUp className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button className="text-left rounded-2xl border border-border/40 bg-card/50 backdrop-blur p-4 hover:bg-accent/50 hover:border-border transition-all">
                  <div className="text-sm font-medium">Create a content calendar</div>
                  <div className="text-xs text-muted-foreground mt-1">for a newsletter</div>
                </button>
                <button className="text-left rounded-2xl border border-border/40 bg-card/50 backdrop-blur p-4 hover:bg-accent/50 hover:border-border transition-all">
                  <div className="text-sm font-medium">Help me debug</div>
                  <div className="text-xs text-muted-foreground mt-1">a Python script</div>
                </button>
                <button className="text-left rounded-2xl border border-border/40 bg-card/50 backdrop-blur p-4 hover:bg-accent/50 hover:border-border transition-all">
                  <div className="text-sm font-medium">Analyze this data</div>
                  <div className="text-xs text-muted-foreground mt-1">with visualizations</div>
                </button>
                <button className="text-left rounded-2xl border border-border/40 bg-card/50 backdrop-blur p-4 hover:bg-accent/50 hover:border-border transition-all">
                  <div className="text-sm font-medium">Explain a concept</div>
                  <div className="text-xs text-muted-foreground mt-1">in simple terms</div>
                </button>
              </div>
              </div>
            </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
