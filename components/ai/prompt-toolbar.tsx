"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { IconSparkles, IconChevronDown, IconPaperclip, IconAt, IconApps, IconFile, IconFolder, IconCode, IconBrandGithub, IconBrandGoogleDrive, IconFileDescription, IconShoppingCart, IconPencil } from "@tabler/icons-react"
import { FileUpload } from "./file-upload"

export function PromptToolbar({ 
  onContextChange, 
  onModelChange, 
  selectedModel: externalSelectedModel 
}: { 
  onContextChange?: (context: string | null) => void
  onModelChange?: (model: string) => void
  selectedModel?: string
}) {
  const [appsOpen, setAppsOpen] = useState(false)
  const [githubEnabled, setGithubEnabled] = useState(false)
  const [driveEnabled, setDriveEnabled] = useState(false)
  const [selectedContext, setSelectedContext] = useState<string | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>(["Aibn"])
  const [selectedModel, setSelectedModel] = useState(externalSelectedModel || "Aibn")

  useEffect(() => {
    if (externalSelectedModel) {
      setSelectedModel(externalSelectedModel)
    }
  }, [externalSelectedModel])

  useEffect(() => {
    loadAvailableModels()
  }, [])

  const loadAvailableModels = async () => {
    try {
      const response = await fetch("/api/api-keys")
      const data = await response.json()
      const models = ["Aibn"]
      
      if (data.providers?.openai) models.push("gpt-4", "gpt-3.5-turbo")
      if (data.providers?.claude) models.push("claude-3-opus", "claude-3-sonnet")
      if (data.providers?.gemini) models.push("gemini-pro")
      
      setAvailableModels(models)
    } catch (error) {
      console.error("Failed to load models:", error)
    }
  }

  const handleModelChange = (model: string) => {
    setSelectedModel(model)
    onModelChange?.(model)
  }

  const handleContextSelect = (context: string) => {
    const newContext = selectedContext === context ? null : context
    setSelectedContext(newContext)
    onContextChange?.(newContext)
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex items-center gap-1.5 px-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs font-medium hover:bg-accent/50 flex-shrink-0">
            <IconSparkles className="h-4 w-4 mr-1.5" />
            {selectedModel}
            <IconChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[160px]">
          {availableModels.map((model) => (
            <DropdownMenuItem key={model} onClick={() => handleModelChange(model)}>
              <IconSparkles className="h-4 w-4 mr-2" />
              <span className="flex-1">{model}</span>
              {model === "Aibn" && <Badge variant="secondary" className="ml-2 text-xs">Recommended</Badge>}
              {selectedModel === model && <span className="ml-2 text-xs">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-5 w-px bg-border/50 flex-shrink-0" />

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs font-medium hover:bg-accent/50 flex-shrink-0">
            <IconPaperclip className="h-4 w-4 mr-1.5" />
            Files
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          <FileUpload />
        </DialogContent>
      </Dialog>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className={`h-8 rounded-full text-xs font-medium hover:bg-accent/50 flex-shrink-0 ${selectedContext ? 'bg-accent' : ''}`}>
            <IconAt className="h-4 w-4 mr-1.5" />
            Context
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[300px]" align="start">
          <Command>
            <CommandInput placeholder="Search context..." />
            <CommandList>
              <CommandEmpty>No context found.</CommandEmpty>
              <CommandGroup heading="Actions">
                <CommandItem onSelect={() => handleContextSelect("canvas")}>
                  <IconPencil className="h-4 w-4 mr-2" />
                  <span>Canvas</span>
                  {selectedContext === "canvas" && <span className="ml-auto text-xs">✓</span>}
                </CommandItem>
                <CommandItem onSelect={() => handleContextSelect("create-blog")}>
                  <IconFileDescription className="h-4 w-4 mr-2" />
                  <span>Create Blog</span>
                  {selectedContext === "create-blog" && <span className="ml-auto text-xs">✓</span>}
                </CommandItem>
                <CommandItem onSelect={() => handleContextSelect("create-product")}>
                  <IconShoppingCart className="h-4 w-4 mr-2" />
                  <span>Create Product</span>
                  {selectedContext === "create-product" && <span className="ml-auto text-xs">✓</span>}
                </CommandItem>
                <CommandItem onSelect={() => handleContextSelect("manage-products")}>
                  <IconShoppingCart className="h-4 w-4 mr-2" />
                  <span>Manage Products</span>
                  {selectedContext === "manage-products" && <span className="ml-auto text-xs">✓</span>}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={appsOpen} onOpenChange={setAppsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs font-medium hover:bg-accent/50 flex-shrink-0">
            <IconApps className="h-4 w-4 mr-1.5" />
            Apps
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Connect Apps</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Search apps..." className="w-full" />
            <div className="grid grid-cols-2 gap-3">
              <div className="group relative flex flex-col gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                      <IconBrandGithub className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">GitHub</p>
                      <p className="text-xs text-muted-foreground">Code repository</p>
                    </div>
                  </div>
                  <Switch checked={githubEnabled} onCheckedChange={setGithubEnabled} />
                </div>
              </div>
              <div className="group relative flex flex-col gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                      <IconBrandGoogleDrive className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Google Drive</p>
                      <p className="text-xs text-muted-foreground">Cloud storage</p>
                    </div>
                  </div>
                  <Switch checked={driveEnabled} onCheckedChange={setDriveEnabled} />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {githubEnabled && (
        <>
          <div className="h-5 w-px bg-border/50 flex-shrink-0" />
          <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs font-medium hover:bg-accent/50 flex-shrink-0">
            <IconBrandGithub className="h-4 w-4 mr-1.5" />
            GitHub
          </Button>
        </>
      )}

      {driveEnabled && (
        <>
          <div className="h-5 w-px bg-border/50 flex-shrink-0" />
          <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs font-medium hover:bg-accent/50 flex-shrink-0">
            <IconBrandGoogleDrive className="h-4 w-4 mr-1.5" />
            Drive
          </Button>
        </>
      )}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
