/**
 * Resolve an entity ID to a human-readable display name.
 *
 * Supports objects with:
 *   - `name` only  →  returns name
 *   - `code` + `description`  →  returns "code — description"
 *   - `number` + `name`  →  returns "number — name"
 *
 * Returns "—" when the item is not found.
 */
export function lookupName(
  id: string,
  list: {
    id: string;
    name?: string;
    code?: string;
    description?: string;
    number?: string;
  }[]
): string {
  const item = list.find((i) => i.id === id);
  if (!item) return "—";
  if (item.code) return item.description ?? "—";
  return item.name ?? "—";
}

/** Capitalize the first letter of a string. */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Format a project as "number — name". */
export function formatProjectName(project: {
  name: string;
  number: string;
}): string {
  return `${project.number} — ${project.name}`;
}
