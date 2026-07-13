const PALETTE = [
  "#3568f5",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#a3a635",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#a855f7",
  "#6366f1",
];

export function colorForProject(projectId: string): string {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = (hash * 31 + projectId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
