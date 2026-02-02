"use client"

import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { IconArrowUp, IconMicrophone, IconPlayerPause } from "@tabler/icons-react"
import { PromptToolbar } from "./prompt-toolbar"

interface AIPromptBoxProps {
  input: string
  setInput: (value: string) => void
  onSubmit: () => void
  isStreaming: boolean
  onStop?: () => void
  onContextChange?: (context: string | null) => void
  onModelChange?: (model: string) => void
  selectedModel?: string
}

export function AIPromptBox({ 
  input, 
  setInput, 
  onSubmit, 
  isStreaming, 
  onStop,
  onContextChange,
  onModelChange,
  selectedModel
}: AIPromptBoxProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-3xl border border-border/30 bg-muted/50 backdrop-blur-2xl p-3 shadow-2xl shadow-black/20">
      <PromptToolbar onContextChange={onContextChange} onModelChange={onModelChange} selectedModel={selectedModel} />

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
            <Button onClick={onStop} size="icon" variant="destructive" className="h-9 w-9 rounded-full shadow-sm">
              <IconPlayerPause className="h-5 w-5" />
            </Button>
          ) : (
            <Button onClick={onSubmit} size="icon" className="h-9 w-9 rounded-full shadow-sm">
              <IconArrowUp className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
