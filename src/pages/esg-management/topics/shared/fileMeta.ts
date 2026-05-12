export interface TopicFileMeta {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export function filesToMetaList(files: FileList | null): TopicFileMeta[] {
  if (!files?.length) return [];
  return Array.from(files).map((f) => ({
    name: f.name,
    size: f.size,
    type: f.type || "application/octet-stream",
    lastModified: f.lastModified,
  }));
}
