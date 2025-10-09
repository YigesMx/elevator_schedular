import { Grip } from "lucide-react"

import { Button } from "@/components/ui/button"

export function Handle() {
  return (
    <Button variant="secondary" size="icon" className="size-8 drag-handle">
      <Grip />
    </Button>
  )
}
