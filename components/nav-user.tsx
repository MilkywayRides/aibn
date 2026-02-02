"use client"

import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconNotification,
  IconUserCircle,
} from "@tabler/icons-react"
import { useState, useEffect } from "react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useSession, signOut } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IconSettings, IconBell, IconShield, IconChevronRight, IconKey } from "@tabler/icons-react"

const menuItems = [
  { id: "profile", label: "Profile", icon: IconUserCircle },
  { id: "settings", label: "Settings", icon: IconSettings },
  { id: "notifications", label: "Notifications", icon: IconBell },
  { id: "security", label: "Security", icon: IconShield },
  { id: "api", label: "API", icon: IconKey },
]

export function NavUser() {
  const { isMobile } = useSidebar()
  const { data: session } = useSession()
  const router = useRouter()
  const [accountOpen, setAccountOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const [sessions, setSessions] = useState<any[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [apiKeys, setApiKeys] = useState({
    openai: "",
    claude: "",
    gemini: "",
  })
  const [savedProviders, setSavedProviders] = useState<Record<string, boolean>>({})
  const [savingApiKey, setSavingApiKey] = useState(false)

  const loadApiKeys = async () => {
    try {
      const response = await fetch("/api/api-keys")
      const data = await response.json()
      setSavedProviders(data.providers || {})
    } catch (error) {
      console.error("Failed to load API keys:", error)
    }
  }

  const saveApiKey = async (provider: string, apiKey: string) => {
    if (!apiKey) return
    
    setSavingApiKey(true)
    try {
      await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      })
      await loadApiKeys()
      setApiKeys({ ...apiKeys, [provider]: "" })
    } catch (error) {
      console.error("Failed to save API key:", error)
    } finally {
      setSavingApiKey(false)
    }
  }

  const deleteApiKey = async (provider: string) => {
    try {
      await fetch("/api/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      })
      await loadApiKeys()
    } catch (error) {
      console.error("Failed to delete API key:", error)
    }
  }

  const loadSessions = async () => {
    setLoadingSessions(true)
    try {
      const response = await fetch("/api/sessions")
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error("Failed to load sessions:", error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const terminateSession = async (sessionId: string) => {
    try {
      await fetch("/api/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
      loadSessions()
    } catch (error) {
      console.error("Failed to terminate session:", error)
    }
  }

  const terminateAllSessions = async () => {
    try {
      await fetch("/api/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terminateAll: true }),
      })
      loadSessions()
    } catch (error) {
      console.error("Failed to terminate sessions:", error)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  const user = session?.user || {
    name: "Guest User",
    email: "guest@example.com",
    image: "",
  }

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "GU"

  const avatarUrl = user.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || "Guest")}`

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={avatarUrl} alt={user.name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setAccountOpen(true)}>
                <IconUserCircle />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconCreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconNotification />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <IconLogout />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent className="w-[95vw] sm:w-[50vw] sm:max-w-[50vw] h-[600px] p-0">
          <div className="flex flex-col sm:flex-row h-full overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r p-4 space-y-1">
              <div className="px-3 py-2 mb-4">
                <h2 className="text-lg font-semibold">Account</h2>
              </div>
              <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0">
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "secondary" : "ghost"}
                  className="flex-shrink-0 sm:w-full justify-start gap-3"
                  onClick={() => {
                    setActiveTab(item.id)
                    if (item.id === "security") loadSessions()
                    if (item.id === "api") loadApiKeys()
                  }}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  <IconChevronRight className="h-4 w-4 ml-auto hidden sm:inline" />
                </Button>
              ))}
              </div>
              <Separator className="my-4 hidden sm:block" />
              <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hidden sm:flex" onClick={handleLogout}>
                <IconLogout className="h-4 w-4" />
                Logout
              </Button>
            </div>

            {/* Right Content */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 sm:p-6">
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">Profile</h3>
                    <p className="text-sm text-muted-foreground">Manage your profile information</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" defaultValue={user.name || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue={user.email || ""} disabled />
                    </div>
                    <Button>Save Changes</Button>
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">Settings</h3>
                    <p className="text-sm text-muted-foreground">Configure your preferences</p>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Settings options coming soon...</p>
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">Notifications</h3>
                    <p className="text-sm text-muted-foreground">Manage notification preferences</p>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Notification settings coming soon...</p>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">Security</h3>
                    <p className="text-sm text-muted-foreground">Manage your security settings</p>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Active Sessions</h4>
                      {loadingSessions ? (
                        <p className="text-sm text-muted-foreground">Loading sessions...</p>
                      ) : sessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No active sessions</p>
                      ) : (
                        <div className="space-y-3">
                          {sessions.map((sess, index) => {
                            const isCurrent = index === 0
                            const timeAgo = new Date(sess.expiresAt).getTime() > Date.now() 
                              ? "Active now" 
                              : "Expired"
                            
                            return (
                              <div key={sess.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                    isCurrent ? "bg-green-100 dark:bg-green-900" : "bg-muted"
                                  }`}>
                                    <IconShield className={`h-5 w-5 ${
                                      isCurrent ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                                    }`} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">
                                      {isCurrent ? "Current Session" : `Session ${index + 1}`}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(sess.createdAt).toLocaleDateString()} • {timeAgo}
                                    </p>
                                  </div>
                                </div>
                                {isCurrent ? (
                                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Active</span>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-destructive"
                                    onClick={() => terminateSession(sess.id)}
                                  >
                                    Terminate
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    {sessions.length > 1 && (
                      <>
                        <Separator />
                        <div>
                          <Button variant="destructive" size="sm" onClick={terminateAllSessions}>
                            Terminate All Other Sessions
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "api" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">API Keys</h3>
                    <p className="text-sm text-muted-foreground">Securely store your API keys with AES-256-GCM encryption</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="openai">OpenAI API Key (ChatGPT)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="openai"
                          type="password"
                          placeholder="sk-..."
                          value={apiKeys.openai}
                          onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                          disabled={savingApiKey}
                        />
                        {savedProviders.openai ? (
                          <Button size="sm" variant="outline" onClick={() => deleteApiKey("openai")}>
                            Remove
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => saveApiKey("openai", apiKeys.openai)} disabled={!apiKeys.openai || savingApiKey}>
                            Save
                          </Button>
                        )}
                      </div>
                      {savedProviders.openai && (
                        <p className="text-xs text-green-600 dark:text-green-400">✓ API key saved securely</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="claude">Anthropic API Key (Claude)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="claude"
                          type="password"
                          placeholder="sk-ant-..."
                          value={apiKeys.claude}
                          onChange={(e) => setApiKeys({ ...apiKeys, claude: e.target.value })}
                          disabled={savingApiKey}
                        />
                        {savedProviders.claude ? (
                          <Button size="sm" variant="outline" onClick={() => deleteApiKey("claude")}>
                            Remove
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => saveApiKey("claude", apiKeys.claude)} disabled={!apiKeys.claude || savingApiKey}>
                            Save
                          </Button>
                        )}
                      </div>
                      {savedProviders.claude && (
                        <p className="text-xs text-green-600 dark:text-green-400">✓ API key saved securely</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gemini">Google API Key (Gemini)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="gemini"
                          type="password"
                          placeholder="AIza..."
                          value={apiKeys.gemini}
                          onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                          disabled={savingApiKey}
                        />
                        {savedProviders.gemini ? (
                          <Button size="sm" variant="outline" onClick={() => deleteApiKey("gemini")}>
                            Remove
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => saveApiKey("gemini", apiKeys.gemini)} disabled={!apiKeys.gemini || savingApiKey}>
                            Save
                          </Button>
                        )}
                      </div>
                      {savedProviders.gemini && (
                        <p className="text-xs text-green-600 dark:text-green-400">✓ API key saved securely</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  )
}
