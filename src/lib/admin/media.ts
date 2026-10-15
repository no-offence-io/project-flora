import "server-only";
import { adminClient } from "./sanity";

/*
 * Uploads and the shape of image/file fields, shared by every admin form. A form field named
 * `photo` posts `photo` (a File, possibly empty), `photo.remove` (checkbox) and `photo.existing`
 * (the current asset id); these helpers turn that into what Sanity stores.
 */

const MAX_IMAGE = 15 * 1024 * 1024;
const MAX_VIDEO = 60 * 1024 * 1024;

export type ImageValue = { _type: "localizedImage" | "image"; _key?: string; asset: { _type: "reference"; _ref: string } };
export type FileValue = { _type: "file"; asset: { _type: "reference"; _ref: string } };

export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image`);
  if (file.size > MAX_IMAGE) throw new Error(`${file.name} is larger than 15 MB`);
  const asset = await adminClient().assets.upload("image", Buffer.from(await file.arrayBuffer()), { filename: file.name, contentType: file.type });
  return asset._id;
}

export async function uploadVideo(file: File): Promise<string> {
  if (!/^video\/(mp4|webm)$/.test(file.type)) throw new Error(`${file.name} must be an MP4 or WebM`);
  if (file.size > MAX_VIDEO) throw new Error(`${file.name} is larger than 60 MB`);
  const asset = await adminClient().assets.upload("file", Buffer.from(await file.arrayBuffer()), { filename: file.name, contentType: file.type });
  return asset._id;
}

const isFile = (v: FormDataEntryValue | null): v is File => v instanceof File && v.size > 0;

/**
 * Resolve an image field: a new upload wins, "remove" clears it, otherwise the existing asset stays.
 * Returns `null` when the field should be unset.
 */
export async function readImageField(form: FormData, name: string, type: "localizedImage" | "image" = "localizedImage"): Promise<ImageValue | null> {
  const file = form.get(name);
  if (isFile(file)) return { _type: type, asset: { _type: "reference", _ref: await uploadImage(file) } };
  if (form.get(`${name}.remove`) === "on") return null;
  const existing = String(form.get(`${name}.existing`) ?? "");
  return existing ? { _type: type, asset: { _type: "reference", _ref: existing } } : null;
}

export async function readVideoField(form: FormData, name: string): Promise<FileValue | null> {
  const file = form.get(name);
  if (isFile(file)) return { _type: "file", asset: { _type: "reference", _ref: await uploadVideo(file) } };
  if (form.get(`${name}.remove`) === "on") return null;
  const existing = String(form.get(`${name}.existing`) ?? "");
  return existing ? { _type: "file", asset: { _type: "reference", _ref: existing } } : null;
}

export type MediaAsset = {
  _id: string;
  _type: "sanity.imageAsset" | "sanity.fileAsset";
  url: string;
  originalFilename?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  _createdAt: string;
  /** Documents that reference the asset; 0 means it can be deleted. */
  usedBy: number;
};

export async function listMedia(): Promise<MediaAsset[]> {
  return adminClient().fetch<MediaAsset[]>(`*[_type in ["sanity.imageAsset", "sanity.fileAsset"]] | order(_createdAt desc)[0...300]{
    _id, _type, url, originalFilename, mimeType, size, "width": metadata.dimensions.width, "height": metadata.dimensions.height, _createdAt,
    "usedBy": count(*[references(^._id)])
  }`);
}

export const formatBytes = (n?: number) => (n === undefined ? "" : n < 1024 * 1024 ? `${Math.round(n / 1024)} kB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
