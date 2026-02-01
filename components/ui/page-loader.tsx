"use client"

import { IconLoader2 } from "@tabler/icons-react"

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen w-screen">
      <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}
