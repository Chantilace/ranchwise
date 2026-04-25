import { ArrowLeft } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell"

export function CattleProfileStubPage() {
  const { pastureId, cattleId } = useParams<{ pastureId?: string; cattleId: string }>()
  const fromPastureContext = Boolean(pastureId)

  return (
    <RanchWorkspaceShell searchValue="" onSearchChange={() => {}}>
      <Link
        to={fromPastureContext ? `/pastures/${pastureId}` : "/cattle"}
        className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {fromPastureContext ? "Back to pasture" : "Cattle"}
      </Link>
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">Cattle profile</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Individual animal profile for{" "}
          <span className="font-medium text-foreground">{cattleId ? decodeURIComponent(cattleId) : "—"}</span>
          {fromPastureContext ? (
            <>
              {" "}
              in pasture <span className="font-medium text-foreground">{pastureId}</span>
            </>
          ) : null}{" "}
          will be added in a future iteration.
        </p>
      </div>
    </RanchWorkspaceShell>
  )
}
