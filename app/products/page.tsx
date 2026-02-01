"use client"

import { useState, useEffect } from "react"
import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { IconPlus, IconEdit, IconTrash, IconSparkles, IconLoader2 } from "@tabler/icons-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { PageLoader } from "@/components/ui/page-loader"

interface Product {
  id: string
  name: string
  description: string
  price: string
  stock: string
  image: string | null
  createdAt: Date
}

export default function ProductsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    document.title = "Products - Aibn"
  }, [])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("")
  const [image, setImage] = useState("")
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiGenerating, setAiGenerating] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)

  const loadProducts = async () => {
    try {
      const response = await fetch("/api/products")
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error("Failed to load products:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!session) {
      router.push("/login")
      return
    }
    loadProducts()
    setPageLoading(false)
  }, [session, router])

  if (pageLoading) return <PageLoader />

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return
    
    setAiGenerating(true)
    try {
      const response = await fetch("/api/ai/generate-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      })

      const data = await response.json()
      
      if (data.product) {
        setName(data.product.name)
        setDescription(data.product.description)
        setPrice(data.product.price)
        setStock(data.product.stock)
        setImage(data.product.image || "")
        setAiDialogOpen(false)
        setDialogOpen(true)
      }
    } catch (error) {
      console.error("Error generating product:", error)
    } finally {
      setAiGenerating(false)
    }
  }

  const improveWithAI = async (field: 'description' | 'name') => {
    setAiGenerating(true)
    try {
      const response = await fetch("/api/ai/improve-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          field,
          value: field === 'name' ? name : description,
          context: { name, description, price, stock }
        }),
      })

      const data = await response.json()
      
      if (data.improved) {
        if (field === 'name') setName(data.improved)
        else setDescription(data.improved)
      }
    } catch (error) {
      console.error("Error improving with AI:", error)
    } finally {
      setAiGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingProduct) {
        await fetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, price, stock, image }),
        })
      } else {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            price,
            stock,
            image,
            userId: session?.user?.id,
          }),
        })
      }
      
      resetForm()
      setDialogOpen(false)
      loadProducts()
    } catch (error) {
      console.error("Error saving product:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName("")
    setDescription("")
    setPrice("")
    setStock("")
    setImage("")
    setEditingProduct(null)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setName(product.name)
    setDescription(product.description)
    setPrice(product.price)
    setStock(product.stock)
    setImage(product.image || "")
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    setProductToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!productToDelete) return

    try {
      await fetch(`/api/products/${productToDelete}`, { method: "DELETE" })
      loadProducts()
    } catch (error) {
      console.error("Error deleting product:", error)
    } finally {
      setDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  const handleNewProduct = () => {
    resetForm()
    setDialogOpen(true)
  }

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
      <SidebarInset className="flex-1">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 justify-between">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Products</h1>
          </div>
          <div className="flex gap-2">
            <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <IconSparkles className="h-4 w-4 mr-2" />
                  AI Generate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Product with AI</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe the product you want to create... e.g., 'A premium wireless headphone with noise cancellation'"
                    rows={4}
                  />
                  <Button onClick={generateWithAI} disabled={aiGenerating} className="w-full">
                    {aiGenerating ? (
                      <>
                        <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <IconSparkles className="h-4 w-4 mr-2" />
                        Generate Product
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleNewProduct}>
                  <IconPlus className="h-4 w-4 mr-2" />
                  New Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? "Edit Product" : "Create New Product"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium">Name</label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => improveWithAI('name')}
                        disabled={aiGenerating || !name}
                      >
                        <IconSparkles className="h-3 w-3 mr-1" />
                        Improve
                      </Button>
                    </div>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Product name"
                      required
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium">Description</label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => improveWithAI('description')}
                        disabled={aiGenerating || !description}
                      >
                        <IconSparkles className="h-3 w-3 mr-1" />
                        Improve
                      </Button>
                    </div>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Product description"
                      rows={3}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Price</label>
                      <Input
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Stock</label>
                      <Input
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Image URL</label>
                    <Input
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading products...</p>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No products yet</p>
              <Button onClick={handleNewProduct}>
                <IconPlus className="h-4 w-4 mr-2" />
                Create Your First Product
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded-md border"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-md border flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">No image</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground md:hidden">
                          {product.description.substring(0, 50)}...
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-md">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${parseFloat(product.price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          parseInt(product.stock) < 10 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                            : parseInt(product.stock) < 50
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {product.stock} left
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(product)}
                          >
                            <IconEdit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(product.id)}
                          >
                            <IconTrash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SidebarInset>
      
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={confirmDelete}
      />
    </SidebarProvider>
  )
}
