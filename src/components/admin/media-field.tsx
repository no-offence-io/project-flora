import Image from "next/image";
import { Labelled } from "./ui";

/*
 * Image and video fields for the admin forms: what's there now, a way to replace it, a way to
 * remove it. They post plain form fields; src/lib/admin/media.ts turns those into Sanity values.
 */

export type CurrentImage = { _ref: string; url: string } | null | undefined;
export type CurrentVideo = { _ref: string; url: string; filename?: string } | null | undefined;

/** The cart's thumbnail treatment: the whole photo on a light box, never cropped. */
export function Thumb({ url, alt = "", className = "" }: { url?: string | null; alt?: string; className?: string }) {
  return (
    <span className={`relative flex aspect-[4/5] w-full items-center justify-center bg-[#f7f7f7] ${className}`}>
      {url ? <Image src={url} alt={alt} fill sizes="200px" className="object-contain p-[12px]" /> : <span className="font-gotham text-[11px] text-black/50">No photo</span>}
    </span>
  );
}

export function ImageField({ name, label, current, hint }: { name: string; label: string; current: CurrentImage; hint?: string }) {
  return (
    <Labelled label={label} hint={hint}>
      <div className="flex gap-[12px]">
        <Thumb url={current?.url} className="w-[120px] shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-[12px] font-gotham text-paragraph">
          <input type="hidden" name={`${name}.existing`} value={current?._ref ?? ""} />
          <input type="file" name={name} accept="image/*" className="text-paragraph file:mr-[12px] file:border file:border-black/20 file:bg-transparent file:px-[12px] file:py-[8px] file:font-gotham file:text-paragraph file:text-black" />
          {current && (
            <label className="flex items-center gap-[6px] text-[11px] text-black/50">
              <input type="checkbox" name={`${name}.remove`} className="accent-black" /> Remove this photo
            </label>
          )}
        </div>
      </div>
    </Labelled>
  );
}

export function VideoField({ name, label, current, hint }: { name: string; label: string; current: CurrentVideo; hint?: string }) {
  return (
    <Labelled label={label} hint={hint}>
      <div className="flex flex-col gap-[12px] font-gotham text-paragraph">
        {current ? (
          <video src={current.url} controls muted playsInline preload="metadata" className="aspect-video w-full max-w-[520px] bg-[#f7f7f7]" />
        ) : (
          <span className="flex aspect-video w-full max-w-[520px] items-center justify-center bg-[#f7f7f7] text-[11px] text-black/50">No video uploaded — the site shows its built-in one</span>
        )}
        {current?.filename && <span className="text-[11px] text-black/50">{current.filename}</span>}
        <input type="hidden" name={`${name}.existing`} value={current?._ref ?? ""} />
        <input type="file" name={name} accept="video/mp4,video/webm" className="text-paragraph file:mr-[12px] file:border file:border-black/20 file:bg-transparent file:px-[12px] file:py-[8px] file:font-gotham file:text-paragraph file:text-black" />
        {current && (
          <label className="flex items-center gap-[6px] text-[11px] text-black/50">
            <input type="checkbox" name={`${name}.remove`} className="accent-black" /> Remove this video
          </label>
        )}
      </div>
    </Labelled>
  );
}
