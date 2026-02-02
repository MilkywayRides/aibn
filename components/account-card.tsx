"use client"

import { useState } from "react"
import { useSession } from "@/lib/auth-client"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { IconUser, IconSettings, IconBell, IconShield, IconLogout, IconChevronRight } from "@tabler/icons-react"

const menuItems = [
  { id: "profile", label: "Profile", icon: IconUser },
  { id: "settings", label: "Settings", icon: IconSettings },
  { id: "notifications", label: "Notifications", icon: IconBell },
  { id: "security", label: "Security", icon: IconShield },
]

export function AccountCard() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")

  if (!session?.user) return null

  return (
    <>
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 px-2"
        onClick={() => setOpen(true)}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
          {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase()}
        </div>
        <div className="flex flex-col items-start text-sm">
          <span className="font-medium">{session.user.name || "User"}</span>
          <span className="text-xs text-muted-foreground">{session.user.email}</span>
        </div>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl h-[600px] p-0">
          <div className="flex h-full">
            {/* Left Sidebar */}
            <div className="w-64 border-r p-4 space-y-1">
              <div className="px-3 py-2 mb-4">
                <h2 className="text-lg font-semibold">Account</h2>
              </div>
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3"
                  onClick={() => setActiveTab(item.id)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  <IconChevronRight className="h-4 w-4 ml-auto" />
                </Button>
              ))}
              <Separator className="my-4" />
              <Button variant="ghost" className="w-full justify-start gap-3 text-destructive">
                <IconLogout className="h-4 w-4" />
                Logout
              </Button>
            </div>

            {/* Right Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">Profile</h3>
                    <p className="text-sm text-muted-foreground">Manage your profile information</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" defaultValue={session.user.name || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue={session.user.email || ""} disabled />
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
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Security settings coming soon...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
