"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import {
  IconDashboard,
  IconHelp,
  IconInnerShadowTop,
  IconSettings,
  IconSparkles,
  IconFileDescription,
  IconShoppingCart,
  IconStar,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    { title: "AI Chat", url: "/", icon: IconSparkles },
    { title: "Blogs", url: "/blogs", icon: IconFileDescription },
    { title: "Products", url: "/products", icon: IconShoppingCart },
    { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
  ],
  navSecondary: [
    { title: "Settings", url: "#", icon: IconSettings },
    { title: "Help", url: "#", icon: IconHelp },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const { data: session } = useSession()
  const [chats, setChats] = React.useState<Array<{ id: string; title: string; favorite: boolean }>>([])
  const [loading, setLoading] = React.useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [chatToDelete, setChatToDelete] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (session?.user?.id) {
      loadChats()
    }
  }, [session])

  const loadChats = async () => {
    if (!session?.user?.id) return
    setLoading(true)
    try {
      const response = await fetch(`/api/chat?userId=${session.user.id}`)
      const data = await response.json()
      setChats(data.chats || [])
    } catch (err) {
      console.error("Failed to load chats:", err)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async (chatId: string, currentFavorite: boolean) => {
    try {
      await fetch(`/api/chat/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: !currentFavorite }),
      })
      loadChats()
    } catch (err) {
      console.error("Failed to toggle favorite:", err)
    }
  }

  const deleteChat = async (chatId: string) => {
    setChatToDelete(chatId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!chatToDelete) return
    try {
      await fetch(`/api/chat/${chatToDelete}`, { method: "DELETE" })
      loadChats()
    } catch (err) {
      console.error("Failed to delete chat:", err)
    } finally {
      setDeleteDialogOpen(false)
      setChatToDelete(null)
    }
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">BlazeNeuro</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />

        {/* Chat History Section */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Chat History</SidebarGroupLabel>
          <SidebarGroupContent>
            <ScrollArea className={chats.length > 8 ? "h-[250px]" : "h-auto max-h-[250px]"}>
              <SidebarMenu>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <div className="px-2 py-1.5">
                        <Skeleton className="h-5 w-full" />
                      </div>
                    </SidebarMenuItem>
                  ))
                ) : chats.length === 0 ? (
                  <SidebarMenuItem>
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No chats yet</div>
                  </SidebarMenuItem>
                ) : (
                  chats.map((chat) => (
                    <SidebarMenuItem key={chat.id} className="relative group/item">
                      <SidebarMenuButton
                        tooltip={chat.title}
                        onClick={() => router.push(`/chat/${chat.id}`)}
                        className="w-full justify-start pr-16"
                      >
                        <span className="truncate text-sm">{chat.title}</span>
                      </SidebarMenuButton>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(chat.id, chat.favorite)
                          }}
                          className="p-1 hover:bg-sidebar-accent rounded-md"
                        >
                          {chat.favorite ? (
                            <IconStarFilled className="h-3 w-3 text-yellow-500" />
                          ) : (
                            <IconStar className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteChat(chat.id)
                          }}
                          className="p-1 hover:bg-sidebar-accent rounded-md"
                        >
                          <IconTrash className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>

        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Chat"
        description="Are you sure you want to delete this chat? This action cannot be undone."
        onConfirm={confirmDelete}
      />
    </Sidebar>
  )
}
