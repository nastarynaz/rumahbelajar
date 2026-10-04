import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn("field", className)} {...props} />
}
