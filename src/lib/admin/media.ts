import "server-only";
import { adminClient } from "./sanity";
import { readLocalizedString, type LocalizedString } from "./localized";

/*
 * Uploads and the shape of image/file fields, shared by every admin form. A form field named
 * `photo` posts `photo` (a File, possibly empty), `photo.remove` (checkbox) and `photo.existing`
 * (the current asset id); these helpers turn that into what Sanity stores. The media editor adds
 * `photo.scale`, `photo.x`, `photo.y` (how the picture sits in its box) and `photo.alt.en` /
 * `photo.alt.no` (its name); see readFit and readImageField.
 */

const MAX_IMAGE = 15 * 1024 * 1024;
const MAX_VIDEO = 60 * 1024 * 1024;

export type ImageValue = { _type: "localizedImage" | "image"; _key?: string; asset: { _type: "reference"; _ref: string }; alt?: LocalizedString; scale?: number | null; x?: number | null; y?: number | null };
/** How a picture sits in its box, as the media editor posts it: percent values, null for the default. */
export type FitFields = { scale: number | null; x: number | null; y: number | null };
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
  if (!isFile(file) && form.get(`${name}.remove`) === "on") return null;
  const existing = String(form.get(`${name}.existing`) ?? "");
  const ref = isFile(file) ? await uploadImage(file) : existing;
  if (!ref) return null;
  const value: ImageValue = { _type: type, asset: { _type: "reference", _ref: ref } };
  // The editor's extras, only for the image type that has somewhere to keep them.
  if (type === "localizedImage") {
    if (form.has(`${name}.alt.en`) || form.has(`${name}.alt.no`)) value.alt = readLocalizedString(form, `${name}.alt`);
    if (form.has(`${name}.scale`)) Object.assign(value, readFit(form, name));
  }
  return value;
}

/** The media editor's placement fields. 100 / 0 / 0 (the usual fit) comes back as nulls, so nothing is stored for an untouched picture. */
export function readFit(form: FormData, name: string): FitFields {
  const num = (k: string, lo: number, hi: number) => {
    const n = Number(String(form.get(`${name}.${k}`) ?? "").replace(",", "."));
    return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n * 10) / 10 : null;
  };
  const scale = num("scale", 10, 500);
  const x = num("x", -200, 200);
  const y = num("y", -200, 200);
  return { scale: scale !== null && Math.round(scale) !== 100 ? Math.round(scale) : null, x: x || null, y: y || null };
}

export async function readVideoField(form: FormData, name: string): Promise<FileValue | null> {
  const file = form.get(name);
  if (!isFile(file) && form.get(`${name}.remove`) === "on") return null;
  const existing = String(form.get(`${name}.existing`) ?? "");
  const ref = isFile(file) ? await uploadVideo(file) : existing;
  return ref ? { _type: "file", asset: { _type: "reference", _ref: ref } } : null;
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
