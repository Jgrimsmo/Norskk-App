import * as React from "react";

/**
 * When a locked row is unlocked for editing, this hook will automatically
 * re-lock it if the user clicks outside that row without making any changes.
 *
 * Usage:
 *   const { unlockRow, snapshotAndUnlock } = useRelockOnClickOutside(items, unlockedIds, setUnlockedIds);
 *   // Use `unlockRow(id, e)` instead of manually adding to unlockedIds
 *   // Add `data-row-id={item.id}` to each <TableRow>
 */
export function useRelockOnClickOutside<T extends { id: string }>(
  items: T[],
  unlockedIds: Set<string>,
  setUnlockedIds: React.Dispatch<React.SetStateAction<Set<string>>>,
) {
  const snapshots = React.useRef<Map<string, string>>(new Map());

  const unlockRow = React.useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const item = items.find((i) => i.id === id);
      if (item) snapshots.current.set(id, JSON.stringify(item));
      setUnlockedIds((prev) => new Set(prev).add(id));
    },
    [items, setUnlockedIds],
  );

  React.useEffect(() => {
    if (unlockedIds.size === 0) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Ignore clicks inside portals (Select, Popover, Dialog, DropdownMenu, etc.)
      if (
        target.closest("[data-radix-popper-content-wrapper]") ||
        target.closest("[role='dialog']") ||
        target.closest("[data-radix-menu-content]")
      ) {
        return;
      }

      // Find which row (if any) was clicked
      const clickedRowId =
        target.closest<HTMLElement>("[data-row-id]")?.dataset.rowId ?? null;

      setUnlockedIds((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const id of prev) {
          // Don't re-lock the row the user just clicked into
          if (id === clickedRowId) continue;
          const snap = snapshots.current.get(id);
          const current = items.find((i) => i.id === id);
          if (snap && current && snap === JSON.stringify(current)) {
            next.delete(id);
            snapshots.current.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [unlockedIds, items, setUnlockedIds]);

  return { unlockRow };
}
