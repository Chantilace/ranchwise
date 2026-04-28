import { toast } from "sonner"

export const OBSERVATION_DISCARD_TOAST_MS = 5000

type ObservationDiscardToastOptions = {
  /** Defaults to "Observation discarded". */
  message?: string
}

/** Toast after discarding a committed observation; Undo restores the prior store state. */
export function showObservationDiscardedToast(
  onUndo: () => void,
  options?: ObservationDiscardToastOptions
): void {
  const message = options?.message ?? "Observation discarded"
  let undone = false
  const id = toast(message, {
    duration: OBSERVATION_DISCARD_TOAST_MS,
    action: {
      label: "Undo",
      onClick: () => {
        undone = true
        toast.dismiss(id)
        onUndo()
      },
    },
    onDismiss: () => {
      if (undone) return
    },
  })
}
