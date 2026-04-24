import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"

import { TodoCard } from "@/components/home/TodoCard"
import { buttonVariants } from "@/components/ui/button"
import type { ActiveTodo } from "@/lib/todoDerivation"
import { cn } from "@/lib/utils"

export function TodoDrawer({
  open,
  onOpenChange,
  todos,
  onCardNavigate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  todos: ActiveTodo[]
  onCardNavigate: (destination: string) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] transition-opacity data-[ending-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex justify-end p-0">
          <Dialog.Popup className={cnDrawerPopup()}>
            <div className="mb-6 flex items-center justify-between">
              <Dialog.Title className="text-base font-medium tracking-[-0.01em] text-foreground">
                To do
              </Dialog.Title>
              <Dialog.Close
                type="button"
                className={cn(buttonVariants({ variant: "icon", size: "iconGhost" }), "shrink-0")}
                aria-label="Close"
              >
                <X className="size-[18px]" strokeWidth={1.7} aria-hidden />
              </Dialog.Close>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2">
              {todos.map((todo) => (
                <TodoCard
                  key={todo.type}
                  icon={todo.icon}
                  title={todo.title}
                  count={todo.count}
                  chipVariant={todo.chipVariant}
                  layout="drawer"
                  onClick={() => onCardNavigate(todo.destination)}
                />
              ))}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function cnDrawerPopup(): string {
  return [
    "flex h-[100dvh] max-h-[100dvh] w-full min-w-0 flex-col border-border bg-background p-6 shadow-xl outline-none sm:max-w-[480px]",
    "border-l-[0.5px] border-l-border",
  ].join(" ")
}
