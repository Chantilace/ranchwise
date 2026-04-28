import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell"
import { RANCH_DISPLAY_NAME } from "@/lib/workspaceIdentity"

type WorkspacePlaceholderPageProps = {
  title: string
}

export function WorkspacePlaceholderPage({ title }: WorkspacePlaceholderPageProps) {
  return (
    <RanchWorkspaceShell
      searchValue=""
      onSearchChange={() => {}}
      searchPlaceholder="Search everything (coming soon)"
      searchAriaLabel="Search everything"
      contentClassName="min-h-0 flex-1 flex-col gap-0 overflow-hidden bg-background"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2 py-2">
        <h1 className="text-lg font-medium text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {title} for {RANCH_DISPLAY_NAME} is coming soon.
        </p>
      </div>
    </RanchWorkspaceShell>
  )
}
