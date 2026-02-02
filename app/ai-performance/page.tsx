"use client"

import { useState, useEffect } from "react"
import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { IconThumbUp, IconThumbDown, IconMessageCircle, IconDownload } from "@tabler/icons-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { PageLoader } from "@/components/ui/page-loader"

interface FeedbackMessage {
  id: string
  role: string
  content: string
  feedback: string
  userComment: string | null
  createdAt: Date
  chatId: string
  question?: string
}

export default function AIPerformancePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [messages, setMessages] = useState<FeedbackMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [pageLoading, setPageLoading] = useState(true)

  const formatDate = (date: Date) => {
    const d = new Date(date)
    const day = d.getDate()
    const month = d.toLocaleString('en-US', { month: 'short' })
    const year = d.getFullYear()
    return `${day}-${month}-${year}`
  }

  const loadFeedback = async () => {
    if (!session?.user?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/ai-performance?userId=${session.user.id}&type=all`)
      const data = await response.json()
      
      // Filter to only show assistant messages with feedback
      const assistantMessages = (data.messages || []).filter((m: FeedbackMessage) => m.role === "assistant")
      setMessages(assistantMessages)
    } catch (error) {
      console.error("Failed to load feedback:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  const exportDataset = () => {
    const dataset = messages.map(msg => ({
      question: msg.question || "",
      answer: msg.content,
      feedback: msg.feedback,
      userComment: msg.userComment || "",
      timestamp: formatDate(msg.createdAt)
    }))

    const jsonStr = JSON.stringify(dataset, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-training-dataset-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    document.title = "AI Performance - Aibn"
  }, [])

  useEffect(() => {
    if (!session) {
      router.push("/login")
      return
    }
    loadFeedback()
    setPageLoading(false)
  }, [session, router])

  if (pageLoading) return <PageLoader />

  if (!session) return null

  const likedCount = messages.filter(m => m.feedback === "like").length
  const dislikedCount = messages.filter(m => m.feedback === "dislike").length
  const totalFeedback = messages.length

  const filteredMessages = activeTab === "all" 
    ? messages 
    : messages.filter(m => m.feedback === activeTab)

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="h-screen overflow-hidden flex flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">AI Performance</h1>
        </header>

        <ScrollArea className="h-full">
          <div className="p-6">
            <div className="max-w-6xl mx-auto space-y-6 pb-6">
              <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
                  <IconMessageCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalFeedback}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Liked Responses</CardTitle>
                  <IconThumbUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{likedCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalFeedback > 0 ? Math.round((likedCount / totalFeedback) * 100) : 0}% positive
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Disliked Responses</CardTitle>
                  <IconThumbDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dislikedCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalFeedback > 0 ? Math.round((dislikedCount / totalFeedback) * 100) : 0}% negative
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="all">All Feedback</TabsTrigger>
                <TabsTrigger value="like">Liked</TabsTrigger>
                <TabsTrigger value="dislike">Disliked</TabsTrigger>
                <TabsTrigger value="dataset">Dataset View</TabsTrigger>
              </TabsList>

              <TabsContent value="dataset" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Training Dataset</CardTitle>
                        <CardDescription>
                          Export feedback data in JSON format for AI training
                        </CardDescription>
                      </div>
                      <Button onClick={exportDataset} className="gap-2">
                        <IconDownload className="h-4 w-4" />
                        Export JSON
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-lg p-4 max-h-[600px] overflow-auto">
                      <pre className="text-xs">
                        {JSON.stringify(
                          messages.map(msg => ({
                            question: msg.question || "",
                            answer: msg.content,
                            feedback: msg.feedback,
                            userComment: msg.userComment || "",
                            timestamp: formatDate(msg.createdAt)
                          })),
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="all" className="mt-6">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Loading feedback...</p>
                ) : filteredMessages.length === 0 ? (
                  <Card>
                    <CardContent className="py-8">
                      <p className="text-center text-muted-foreground">No feedback yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredMessages.map((msg) => (
                      <Card key={msg.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">
                              {msg.feedback === "like" ? (
                                <span className="flex items-center gap-2 text-green-600">
                                  <IconThumbUp className="h-4 w-4" />
                                  Liked Response
                                </span>
                              ) : (
                                <span className="flex items-center gap-2 text-red-600">
                                  <IconThumbDown className="h-4 w-4" />
                                  Disliked Response
                                </span>
                              )}
                            </CardTitle>
                            <CardDescription>
                              {formatDate(msg.createdAt)}
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {msg.question && (
                            <div className="border-l-2 border-primary pl-4">
                              <p className="text-sm font-medium mb-1">Question:</p>
                              <p className="text-sm text-muted-foreground">{msg.question}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium mb-2">Answer:</p>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                          {msg.userComment && (
                            <div className="border-t pt-4">
                              <p className="text-sm font-medium mb-2">User Comment:</p>
                              <p className="text-sm text-muted-foreground">{msg.userComment}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="like" className="mt-6">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Loading feedback...</p>
                ) : filteredMessages.length === 0 ? (
                  <Card>
                    <CardContent className="py-8">
                      <p className="text-center text-muted-foreground">No feedback yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredMessages.map((msg) => (
                      <Card key={msg.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">
                              {msg.feedback === "like" ? (
                                <span className="flex items-center gap-2 text-green-600">
                                  <IconThumbUp className="h-4 w-4" />
                                  Liked Response
                                </span>
                              ) : (
                                <span className="flex items-center gap-2 text-red-600">
                                  <IconThumbDown className="h-4 w-4" />
                                  Disliked Response
                                </span>
                              )}
                            </CardTitle>
                            <CardDescription>
                              {formatDate(msg.createdAt)}
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {msg.question && (
                            <div className="border-l-2 border-primary pl-4">
                              <p className="text-sm font-medium mb-1">Question:</p>
                              <p className="text-sm text-muted-foreground">{msg.question}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium mb-2">Answer:</p>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                          {msg.userComment && (
                            <div className="border-t pt-4">
                              <p className="text-sm font-medium mb-2">User Comment:</p>
                              <p className="text-sm text-muted-foreground">{msg.userComment}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="dislike" className="mt-6">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Loading feedback...</p>
                ) : filteredMessages.length === 0 ? (
                  <Card>
                    <CardContent className="py-8">
                      <p className="text-center text-muted-foreground">No feedback yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredMessages.map((msg) => (
                      <Card key={msg.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">
                              {msg.feedback === "like" ? (
                                <span className="flex items-center gap-2 text-green-600">
                                  <IconThumbUp className="h-4 w-4" />
                                  Liked Response
                                </span>
                              ) : (
                                <span className="flex items-center gap-2 text-red-600">
                                  <IconThumbDown className="h-4 w-4" />
                                  Disliked Response
                                </span>
                              )}
                            </CardTitle>
                            <CardDescription>
                              {formatDate(msg.createdAt)}
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {msg.question && (
                            <div className="border-l-2 border-primary pl-4">
                              <p className="text-sm font-medium mb-1">Question:</p>
                              <p className="text-sm text-muted-foreground">{msg.question}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium mb-2">Answer:</p>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                          {msg.userComment && (
                            <div className="border-t pt-4">
                              <p className="text-sm font-medium mb-2">User Comment:</p>
                              <p className="text-sm text-muted-foreground">{msg.userComment}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
          </div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  )
}
