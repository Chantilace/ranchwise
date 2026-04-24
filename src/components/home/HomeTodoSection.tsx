import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { TodoCard } from "@/components/home/TodoCard"
import { TodoDrawer } from "@/components/home/TodoDrawer"
import { useRanchData } from "@/contexts/RanchDataContext"
import { deriveActiveTodos } from "@/lib/todoDerivation"
import { cn } from "@/lib/utils"

const VISIBLE_COUNT = 4

export function HomeTodoSection() {
  const navigate = useNavigate()
  const { herdRows, cattle, pastures, observationsByHorse } = useRanchData()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const sortedTodos = useMemo(
    () =>
      deriveActiveTodos({
        cattle,
        pastures,
        horses: herdRows,
        observationsByHorse,
      }),
    [cattle, pastures, herdRows, observationsByHorse]
  )

  if (sortedTodos.length === 0) return null

  const visible = sortedTodos.slice(0, VISIBLE_COUNT)
  const hasViewAll = sortedTodos.length > VISIBLE_COUNT

  return (
    <>
      <section
        className={cn(
          hasViewAll
            ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3"
            : "flex flex-col gap-2"
        )}
      >
        <h2
          className={cn(
            "text-base font-medium tracking-[-0.01em] text-foreground",
            hasViewAll && "min-w-0"
          )}
        >
          To do
        </h2>
        {hasViewAll ? (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={cn(
              "col-start-2 row-start-1 shrink-0 cursor-pointer justify-self-end rounded-md text-sm font-medium",
              "text-muted-foreground transition-colors hover:text-foreground",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            View all ({sortedTodos.length})
          </button>
        ) : null}
        <div
          className={cn(
            "grid grid-cols-1 gap-2 md:flex md:flex-row md:flex-nowrap md:items-stretch md:justify-start md:gap-3",
            hasViewAll && "col-span-2 row-start-2"
          )}
        >
          {visible.map((todo) => (
            <TodoCard
              key={todo.type}
              icon={todo.icon}
              title={todo.title}
              count={todo.count}
              chipVariant={todo.chipVariant}
              layout="grid"
              onClick={() => navigate(todo.destination)}
            />
          ))}
        </div>
      </section>

      <TodoDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        todos={sortedTodos}
        onCardNavigate={(destination) => {
          navigate(destination)
          setDrawerOpen(false)
        }}
      />
    </>
  )
}
