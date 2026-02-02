"use client"

import { useState, useEffect } from "react"
import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { IconPlus, IconEdit, IconTrash, IconExternalLink } from "@tabler/icons-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { PageLoader } from "@/components/ui/page-loader"

interface Blog {
  id: string
  title: string
  content: string
  slug: string
  createdAt: Date
}

export default function BlogsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [blogToDelete, setBlogToDelete] = useState<string | null>(null)

  const loadBlogs = async () => {
    try {
      const response = await fetch("/api/blogs")
      const data = await response.json()
      setBlogs(data.blogs || [])
    } catch (error) {
      console.error("Failed to load blogs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingBlog) {
        // Update
        await fetch(`/api/blogs/${editingBlog.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        })
      } else {
        // Create
        await fetch("/api/blogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            content,
            userId: session?.user?.id,
          }),
        })
      }
      
      setTitle("")
      setContent("")
      setEditingBlog(null)
      setDialogOpen(false)
      loadBlogs()
    } catch (error) {
      console.error("Error saving blog:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (blog: Blog) => {
    setEditingBlog(blog)
    setTitle(blog.title)
    setContent(blog.content)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    setBlogToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!blogToDelete) return

    try {
      await fetch(`/api/blogs/${blogToDelete}`, { method: "DELETE" })
      loadBlogs()
    } catch (error) {
      console.error("Error deleting blog:", error)
    } finally {
      setDeleteDialogOpen(false)
      setBlogToDelete(null)
    }
  }

  const handleNewBlog = () => {
    setEditingBlog(null)
    setTitle("")
    setContent("")
    setDialogOpen(true)
  }

  useEffect(() => {
    document.title = "Blogs - Aibn"
  }, [])

  useEffect(() => {
    if (!session) {
      router.push("/login")
      return
    }
    loadBlogs()
    setPageLoading(false)
  }, [session, router])

  if (pageLoading) return <PageLoader />

  if (!session) return null

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
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 justify-between">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Blogs</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNewBlog}>
                <IconPlus className="h-4 w-4 mr-2" />
                New Blog
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingBlog ? "Edit Blog" : "Create New Blog"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter blog title"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your blog content..."
                    rows={15}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : editingBlog ? "Update Blog" : "Create Blog"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </header>
        
        <ScrollArea className="h-full">
          <div className="p-6">
            {loading ? (
              <p className="text-center text-muted-foreground">Loading blogs...</p>
            ) : blogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No blogs yet</p>
                <Button onClick={handleNewBlog}>
                  <IconPlus className="h-4 w-4 mr-2" />
                  Create Your First Blog
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {blogs.map((blog) => (
                <Card key={blog.id}>
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{blog.title}</CardTitle>
                    <CardDescription>
                      {new Date(blog.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {blog.content.substring(0, 150)}...
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/api/blogs/${blog.slug}`, "_blank")}
                      >
                        <IconExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(blog)}
                      >
                        <IconEdit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(blog.id)}
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          </div>
        </ScrollArea>
      </SidebarInset>
      
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Blog"
        description="Are you sure you want to delete this blog? This action cannot be undone."
        onConfirm={confirmDelete}
      />
    </SidebarProvider>
  )
}
