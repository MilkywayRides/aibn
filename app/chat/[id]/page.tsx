"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { useSession } from "@/lib/auth-client"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { IconArrowUp, IconPlayerPause, IconLoader2, IconThumbUp, IconThumbDown, IconCopy, IconCheck } from "@tabler/icons-react"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { PromptToolbar } from "@/components/ai/prompt-toolbar"
import { Skeleton } from "@/components/ui/skeleton"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"
import { PageLoader } from "@/components/ui/page-loader"

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const chatId = params.id as string

  const [messages, setMessages] = useState<Array<{ id?: string; role: "user" | "assistant"; content: string; feedback?: string; copied?: boolean }>>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null)
  const [feedbackComment, setFeedbackComment] = useState("")

  useEffect(() => {
    document.title = "Chat - Aibn"
  }, [])

  if (isLoading) return <PageLoader />

  const loadMessages = useCallback(async () => {
    if (!chatId) return

    try {
      const res = await fetch(`/api/chat/${chatId}`)
      const data = await res.json()
      if (data.messages) {
        setMessages(data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          feedback: m.feedback
        })))
      }
    } catch (err) {
      console.error("Failed to load messages:", err)
    } finally {
      setIsLoading(false)
    }
  }, [chatId])

  useEffect(() => {
    if (!session) {
      router.push("/login")
      return
    }
    loadMessages()
  }, [chatId, session, router, loadMessages])

  const handleSubmit = async () => {
    if (!input.trim() || isStreaming) return

    const userMessage = input.trim()
    setInput("")

    // Add user message immediately
    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    // Add empty assistant message for streaming
    setMessages(prev => [...prev, { role: "assistant", content: "" }])
    setIsStreaming(true)

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          chatId,
          userId: session?.user?.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Stream error:", errorData)
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

              if (data.type === "chunk" && data.content) {
                // Stream content token by token
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
        if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
          updated[updated.length - 1].content = "Sorry, something went wrong. Please try again."
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
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

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="overflow-hidden">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-2 rounded-br-lg flex items-center gap-2">
          <SidebarTrigger className="rounded-lg" />
        </header>

        <div className="flex flex-col h-[calc(100vh-3.5rem)] relative">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-8 pb-40 space-y-8">
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
                        ) : message.content === "CREATING_BLOG_INDICATOR" ? (
                          <div className="flex items-center gap-2 text-[15px] text-muted-foreground">
                            <IconLoader2 className="h-4 w-4 animate-spin" />
                            <span>Creating blog...</span>
                          </div>
                        ) : message.content === "CREATING_PRODUCT_INDICATOR" ? (
                          <div className="flex items-center gap-2 text-[15px] text-muted-foreground">
                            <IconLoader2 className="h-4 w-4 animate-spin" />
                            <span>Creating product...</span>
                          </div>
                        ) : showShimmer && !message.content ? (
                          <div className="flex items-center gap-2 text-[15px] text-muted-foreground">
                            <IconLoader2 className="h-4 w-4 animate-spin" />
                            <span>Thinking...</span>
                          </div>
                        ) : showShimmer ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />
                                }}
                              >
                                {message.content || "..."}
                              </ReactMarkdown>
                            </div>
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

          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent h-32" />
            <div className="relative max-w-4xl mx-auto p-4 pointer-events-auto">
              <div className="flex flex-col gap-2 rounded-3xl border border-border/30 bg-background/95 backdrop-blur-xl p-3 shadow-2xl">
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
                    {isStreaming ? (
                      <Button size="icon" variant="destructive" className="h-9 w-9 rounded-full shadow-sm">
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
      </SidebarInset>

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
