// A muted, harmonious palette (shared lightness/saturation family) so calendar
// blocks read as considered rather than a bright rainbow of saturated hues.
const PALETTE = [
  "#5E8968", // sage
  "#6E8FA3", // dusty blue
  "#C1682F", // terracotta
  "#C99A3E", // ochre
  "#9C7A93", // mauve
  "#B5714F", // clay
  "#5F7A6C", // moss
  "#8C7A9E", // heather
];

export function colorForProject(projectId: string): string {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = (hash * 31 + projectId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
