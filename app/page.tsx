"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { AIPromptBox } from "@/components/ai/ai-prompt-box"
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
import { IconHistory, IconSearch, IconPlus, IconSparkles, IconStar, IconStarFilled, IconTrash, IconThumbUp, IconThumbDown, IconCopy, IconCheck } from "@tabler/icons-react"
import { useState, useEffect } from "react"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "sonner"
import { PageLoader } from "@/components/ui/page-loader"

export default function Home() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [messages, setMessages] = useState<Array<{ id?: string; role: "user" | "assistant"; content: string; feedback?: string; copied?: boolean }>>([])
  const [input, setInput] = useState("")
  const [historyOpen, setHistoryOpen] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [chats, setChats] = useState<Array<{ id: string; title: string; favorite: boolean; createdAt: Date }>>([])
  const [context, setContext] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [chatToDelete, setChatToDelete] = useState<string | null>(null)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null)
  const [feedbackComment, setFeedbackComment] = useState("")
  const [pageLoading, setPageLoading] = useState(true)

  const loadChats = async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch(`/api/chat?userId=${session.user.id}`)
      const data = await response.json()
      setChats(data.chats || [])
    } catch (err) {
      console.error("Failed to load chats:", err)
    }
  }

  const toggleFavorite = async (chatId: string, currentFavorite: boolean, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/chat/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: !currentFavorite }),
      })
      loadChats()
    } catch (err) {
      console.error("Failed to toggle favorite:", err)
    }
  }

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setChatToDelete(chatId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!chatToDelete) return

    try {
      await fetch(`/api/chat/${chatToDelete}`, { method: "DELETE" })
      loadChats()
    } catch (err) {
      console.error("Failed to delete chat:", err)
    } finally {
      setDeleteDialogOpen(false)
      setChatToDelete(null)
    }
  }

  useEffect(() => {
    document.title = "Aibn - AI Chat"
  }, [])

  useEffect(() => {
    if (!isPending) {
      setPageLoading(false)
    }
  }, [isPending])

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [isPending, session, router])

  useEffect(() => {
    if (session?.user?.id) {
      loadChats()
    }
  }, [session])

  if (pageLoading) return <PageLoader />

  const handleSubmit = async () => {
    if (!input.trim() || isStreaming) return

    const userInput = input.trim()
    setInput("")

    // Optimistic UI - show message immediately
    setMessages(prev => [...prev, { role: "user", content: userInput }])
    setMessages(prev => [...prev, { role: "assistant", content: "" }])
    setIsStreaming(true)

    let streamChatId = ""

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userInput,
          userId: session?.user?.id,
          context,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Stream failed")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === "start" && data.chatId) {
                streamChatId = data.chatId
              }

              if (data.type === "chunk" && data.content) {
                setMessages(prev => {
                  const updated = [...prev]
                  const lastIdx = updated.length - 1
                  if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
                    updated[lastIdx] = {
                      ...updated[lastIdx],
                      content: updated[lastIdx].content + data.content
                    }
                  }
                  return updated
                })
              }

              if (data.type === "done") {
                if (data.messageId) {
                  // Update the last message with its ID
                  setMessages(prev => {
                    const updated = [...prev]
                    const lastIdx = updated.length - 1
                    if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
                      updated[lastIdx] = {
                        ...updated[lastIdx],
                        id: data.messageId
                      }
                    }
                    return updated
                  })
                }
                
                if (streamChatId) {
                  // Navigate to chat page after streaming completes
                  router.replace(`/chat/${streamChatId}`)
                }
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error)
      setMessages(prev => {
        const updated = [...prev]
        if (updated.length > 0) {
          updated[updated.length - 1].content = "Sorry, something went wrong. Please try again."
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }

  const handleStop = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  const handleFeedback = async (messageId: string, feedbackType: "like" | "dislike") => {
    if (feedbackType === "dislike") {
      setFeedbackMessageId(messageId)
      setFeedbackDialogOpen(true)
      return
    }

    try {
      const response = await fetch(`/api/messages/${messageId}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedbackType }),
      })

      if (response.ok) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, feedback: feedbackType } : msg
        ))
        toast.success("Feedback recorded")
      } else {
        toast.error("Failed to record feedback")
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error)
      toast.error("Failed to record feedback")
    }
  }

  const submitDislikeFeedback = async () => {
    if (!feedbackMessageId) return

    try {
      const response = await fetch(`/api/messages/${feedbackMessageId}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          feedback: "dislike",
          userComment: feedbackComment 
        }),
      })

      if (response.ok) {
        setMessages(prev => prev.map(msg => 
          msg.id === feedbackMessageId ? { ...msg, feedback: "dislike" } : msg
        ))
        toast.success("Feedback recorded")
      } else {
        toast.error("Failed to record feedback")
      }
      
      setFeedbackDialogOpen(false)
      setFeedbackComment("")
      setFeedbackMessageId(null)
    } catch (error) {
      console.error("Failed to submit feedback:", error)
      toast.error("Failed to record feedback")
    }
  }

  const handleCopy = async (index: number, content: string) => {
    await navigator.clipboard.writeText(content)
    setMessages(prev => prev.map((msg, i) => 
      i === index ? { ...msg, copied: true } : msg
    ))
    setTimeout(() => {
      setMessages(prev => prev.map((msg, i) => 
        i === index ? { ...msg, copied: false } : msg
      ))
    }, 2000)
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
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {messages.length > 0 ? (
          // Chat View
          <div className="flex flex-col h-full">
            <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-2 rounded-br-lg flex items-center justify-between">
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
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2 pr-4">
                        {chats.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">No chat history yet</p>
                        ) : (
                          chats.map((chat) => (
                            <div
                              key={chat.id}
                              onClick={() => {
                                router.push(`/chat/${chat.id}`)
                                setHistoryOpen(false)
                              }}
                              className="group p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1 flex-1">
                                  <p className="text-sm font-medium leading-none">{chat.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(chat.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => toggleFavorite(chat.id, chat.favorite, e)}
                                  >
                                    {chat.favorite ? (
                                      <IconStarFilled className="h-4 w-4 text-yellow-500" />
                                    ) : (
                                      <IconStar className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => deleteChat(chat.id, e)}
                                  >
                                    <IconTrash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <div className="max-w-3xl mx-auto px-4 py-8 pb-32 space-y-8">
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
                            <div className="space-y-2">
                              <p className="text-[15px] leading-7 text-foreground/90">{message.content || "Thinking..."}</p>
                              {message.id && !showShimmer && (
                                <div className="flex items-center gap-1 pt-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className={`h-7 w-7 p-0 rounded-md hover:bg-accent ${message.copied ? "text-green-600" : ""}`}
                                    onClick={() => handleCopy(index, message.content)}
                                  >
                                    {message.copied ? <IconCheck className="h-3.5 w-3.5" /> : <IconCopy className="h-3.5 w-3.5" />}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className={`h-7 w-7 p-0 rounded-md hover:bg-accent ${message.feedback === "like" ? "text-green-600" : ""}`}
                                    onClick={() => handleFeedback(message.id!, "like")}
                                  >
                                    <IconThumbUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className={`h-7 w-7 p-0 rounded-md hover:bg-accent ${message.feedback === "dislike" ? "text-red-600" : ""}`}
                                    onClick={() => handleFeedback(message.id!, "dislike")}
                                  >
                                    <IconThumbDown className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
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
                <AIPromptBox
                  input={input}
                  setInput={setInput}
                  onSubmit={handleSubmit}
                  isStreaming={isStreaming}
                  onStop={handleStop}
                  onContextChange={setContext}
                />
              </div>
            </div>
          </div>
        ) : (
          // Welcome View
          <div className="flex flex-col h-screen animate-in fade-in duration-500">
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
                  <AIPromptBox
                    input={input}
                    setInput={setInput}
                    onSubmit={handleSubmit}
                    isStreaming={isStreaming}
                    onStop={handleStop}
                    onContextChange={setContext}
                  />
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

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Chat"
        description="Are you sure you want to delete this chat? This action cannot be undone."
        onConfirm={confirmDelete}
      />

      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provide feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              What was the issue with this response? Your feedback helps us improve.
            </p>
            <Textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Tell us what went wrong..."
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitDislikeFeedback}>
                Submit Feedback
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
