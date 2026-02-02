"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { IconX, IconCopy, IconMaximize, IconMinimize, IconPencil, IconGripVertical, IconEye, IconCode, IconDownload, IconChevronDown } from "@tabler/icons-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

interface CanvasProps {
  isOpen: boolean
  onClose: () => void
  content: string
  onContentChange: (content: string) => void
  title?: string
}

export function Canvas({ isOpen, onClose, content, onContentChange, title: initialTitle }: CanvasProps) {
  const [title, setTitle] = useState(initialTitle || "Untitled")
  const [isMaximized, setIsMaximized] = useState(false)
  const [width, setWidth] = useState(50) // percentage
  const [viewMode, setViewMode] = useState<"edit" | "preview">("preview")
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const resizeRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing.current && !isMaximized) {
        const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100
        if (newWidth >= 30 && newWidth <= 70) {
          setWidth(newWidth)
        }
      }
      
      if (isDragging && !isMaximized) {
        const deltaX = e.clientX - dragStart.x
        const deltaY = e.clientY - dragStart.y
        setPosition({ x: deltaX, y: deltaY })
      }
    }

    const handleMouseUp = () => {
      isResizing.current = false
      setIsDragging(false)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isMaximized, isDragging, dragStart])

  if (!isOpen) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
  }

  const handleDownload = (format: string) => {
    try {
      let blob: Blob
      let filename: string
      
      if (format === "txt") {
        blob = new Blob([content], { type: "text/plain;charset=utf-8" })
        filename = `${title}.txt`
      } else if (format === "md") {
        blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
        filename = `${title}.md`
      } else if (format === "html") {
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    h1, h2, h3 { margin-top: 24px; margin-bottom: 16px; }
    p { margin-bottom: 16px; }
  </style>
</head>
<body>
  <div id="content">${content}</div>
</body>
</html>`
        blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" })
        filename = `${title}.html`
      } else if (format === "pdf") {
        handlePdfDownload()
        return
      } else {
        return
      }
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.style.display = "none"
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
    } catch (error) {
      console.error("Download failed:", error)
      alert(`Download failed: ${error}`)
    }
  }

  const handlePdfDownload = async () => {
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      })
      
      // Add title
      pdf.setFontSize(20)
      pdf.setFont(undefined, 'bold')
      pdf.text(title, 15, 20)
      
      // Add content
      pdf.setFontSize(11)
      pdf.setFont(undefined, 'normal')
      
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      const maxWidth = pageWidth - (margin * 2)
      
      // Split content into lines
      const lines = pdf.splitTextToSize(content, maxWidth)
      
      let yPosition = 35
      const lineHeight = 7
      
      lines.forEach((line: string) => {
        // Check if we need a new page
        if (yPosition + lineHeight > pageHeight - margin) {
          pdf.addPage()
          yPosition = margin
        }
        
        pdf.text(line, margin, yPosition)
        yPosition += lineHeight
      })
      
      pdf.save(`${title}.pdf`)
    } catch (error) {
      console.error("PDF download failed:", error)
      alert("PDF download failed. Please try downloading as .txt or .html instead.")
    }
  }

  const handleMouseDown = () => {
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handleDragStart = (e: React.MouseEvent) => {
    if (isMaximized) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    document.body.style.cursor = 'move'
    document.body.style.userSelect = 'none'
  }

  return (
    <div 
      ref={canvasRef}
      className={`flex flex-col h-full border-l bg-background transition-all relative`} 
      style={{ 
        width: isMaximized ? '100%' : `${width}%`,
        transform: isMaximized ? 'none' : `translate(${position.x}px, ${position.y}px)`,
        position: isMaximized ? 'relative' : 'relative'
      }}
    >
      <div 
        ref={resizeRef}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconGripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="flex items-center justify-between p-4 border-b cursor-move" onMouseDown={handleDragStart}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-semibold border-0 shadow-none focus-visible:ring-0 px-0 cursor-text"
          onMouseDown={(e) => e.stopPropagation()}
        />
        <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "edit" | "preview")} className="mr-2">
            <TabsList className="h-8">
              <TabsTrigger value="preview" className="h-7 px-2">
                <IconEye className="h-3.5 w-3.5" />
              </TabsTrigger>
              <TabsTrigger value="edit" className="h-7 px-2">
                <IconCode className="h-3.5 w-3.5" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="icon" variant="ghost" onClick={() => setIsMaximized(!isMaximized)}>
            {isMaximized ? <IconMinimize className="h-4 w-4" /> : <IconMaximize className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={handleCopy}>
            <IconCopy className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <IconDownload className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDownload("txt")}>
                Download as .txt
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("md")}>
                Download as .md
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("html")}>
                Download as .html
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("pdf")}>
                Download as .pdf
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <IconX className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 h-full">
        <div className="h-full">
        {viewMode === "edit" ? (
          <Textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className="w-full h-full min-h-[calc(100vh-8rem)] border-0 shadow-none focus-visible:ring-0 resize-none p-6 font-mono text-sm"
            placeholder="Start writing..."
          />
        ) : (
          <div ref={previewRef} className="p-6 prose prose-sm dark:prose-invert max-w-none min-h-[calc(100vh-8rem)]">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {content || "No content yet..."}
            </ReactMarkdown>
          </div>
        )}
        </div>
      </ScrollArea>
    </div>
  )
}

interface CanvasPreviewProps {
  title: string
  content: string
  onClick: () => void
}

export function CanvasPreview({ title, content, onClick }: CanvasPreviewProps) {
  return (
    <Card 
      className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-2"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
          <IconPencil className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1">{title}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2">{content.substring(0, 100)}...</p>
        </div>
      </div>
    </Card>
  )
}
