"use server";

import { requireAdmin } from "@/lib/admin/session";
import { adminClient } from "@/lib/admin/sanity";

/** What the media editor's "choose from media" grid shows: one line per uploaded photo or video. */
export type PickableAsset = { _id: string; url: string; filename?: string | null; width?: number | null; height?: number | null; size?: number | null };

/** The media bank, newest first, for picking a file into a field without uploading it again. */
export async function pickableMedia(kind: "image" | "video"): Promise<PickableAsset[]> {
  await requireAdmin();
  const filter = kind === "image" ? `_type == "sanity.imageAsset"` : `_type == "sanity.fileAsset" && mimeType match "video/*"`;
  return adminClient().fetch<PickableAsset[]>(`*[${filter}] | order(_createdAt desc)[0...300]{ _id, url, "filename": originalFilename, "width": metadata.dimensions.width, "height": metadata.dimensions.height, size }`);
}
