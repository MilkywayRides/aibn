"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { IconUpload, IconX, IconFile } from "@tabler/icons-react"
import { storage } from "@/lib/storage"

const MAX_FILES = 5

export function FileUpload() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    const remaining = MAX_FILES - files.length
    const newFiles = selected.slice(0, remaining)
    setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    
    setUploading(true)
    try {
      await Promise.all(
        files.map(file => storage.upload(file, 'ai-uploads'))
      )
      setFiles([])
      if (inputRef.current) inputRef.current.value = ''
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-lg p-8 text-center">
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          disabled={files.length >= MAX_FILES}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <IconUpload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Max {MAX_FILES} files ({files.length}/{MAX_FILES})
          </p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2 p-2 border rounded">
              <IconFile className="h-4 w-4" />
              <span className="text-sm flex-1 truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(i)}
                disabled={uploading}
              >
                <IconX className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={files.length === 0 || uploading}
        className="w-full"
      >
        {uploading ? 'Uploading...' : 'Upload Files'}
      </Button>
    </div>
  )
}
