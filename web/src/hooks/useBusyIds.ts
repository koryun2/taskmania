import { useCallback, useState } from "react";

export interface BusyIds {
  has: (id: string) => boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
}

/**
 * Tracks which tasks have a request in flight.
 *
 * A single `isSaving` flag would disable the whole board whenever one card was
 * saving, so this keeps a set and each card checks only its own id.
 */
export function useBusyIds(): BusyIds {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());

  const add = useCallback((id: string) => {
    setIds((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const has = useCallback((id: string) => ids.has(id), [ids]);

  return { has, add, remove };
}
