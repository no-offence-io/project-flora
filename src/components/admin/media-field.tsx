import Image from "next/image";
import MediaEditor, { type CurrentMedia } from "./media-editor";
import { PORTRAIT_FRAME, WIDE_FRAME, type Frame } from "@/lib/media-frames";

/*
 * Image and video fields for the admin forms. Each is the media editor (media-editor.tsx): a
 * preview, an Edit view with crop/placement, replace from upload or the media bank, a name, and
 * remove. They post plain form fields; src/lib/admin/media.ts turns those into Sanity values.
 */

export type CurrentImage = CurrentMedia;
export type CurrentVideo = CurrentMedia;
export { PORTRAIT_FRAME, WIDE_FRAME, PRODUCT_FRAME, SCREEN_FRAMES, productFrames, type Frame } from "@/lib/media-frames";

/** The cart's thumbnail treatment: the whole photo on a light box, never cropped. */
export function Thumb({ url, alt = "", className = "", dark = false }: { url?: string | null; alt?: string; className?: string; dark?: boolean }) {
  return (
    <span className={`relative flex aspect-[4/5] w-full items-center justify-center ${dark ? "bg-black" : "bg-[#f7f7f7]"} ${className}`}>
      {url ? <Image src={url} alt={alt} fill sizes="200px" className="object-contain p-[12px]" /> : <span className="font-gotham text-[11px] text-black/50">No photo</span>}
    </span>
  );
}

/**
 * `placeholder` is the picture the site uses when nothing is uploaded (the built-in logo, say), shown
 * so the field never looks empty while something is in fact in use. `dark` frames a white-on-
 * transparent picture on black so it can be seen. `frame` is the shape of the box the site draws
 * the picture in; `crop` false for pictures the site never crops; `alt` false for fields without a name of their own.
 */
export function ImageField({ name, label, current, hint, placeholder, dark = false, frame = PORTRAIT_FRAME, frames, crop = true, alt = true }: { name: string; label: string; current: CurrentImage; hint?: string; placeholder?: string; dark?: boolean; frame?: Frame; frames?: Frame[]; crop?: boolean; alt?: boolean }) {
  return <MediaEditor name={name} label={label} kind="image" current={current} hint={hint} placeholder={placeholder} dark={dark} frame={frame} frames={frames} crop={crop} alt={alt} />;
}

export function VideoField({ name, label, current, hint, placeholder, frame = WIDE_FRAME, frames }: { name: string; label: string; current: CurrentVideo; hint?: string; placeholder?: string; frame?: Frame; frames?: Frame[] }) {
  return <MediaEditor name={name} label={label} kind="video" current={current} hint={hint} placeholder={placeholder} placeholderNote="Built-in video — in use now. Replace it to use your own." frame={frame} frames={frames} alt={false} />;
}
