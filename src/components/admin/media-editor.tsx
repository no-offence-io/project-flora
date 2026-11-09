"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { pickableMedia, type PickableAsset } from "@/app/admin/(app)/media-actions";
import { getText, type LocalizedString } from "@/lib/admin/localized";
import { isDefaultTransform, mediaStyle, SCALE_MAX, SCALE_MIN, SHIFT_MAX, type MediaTransform } from "@/lib/media-transform";

/*
 * One picture or video on a dashboard form, with an Edit view: move and resize it inside a box
 * shaped like the one the site draws it in, swap it for a new upload or a file from the media
 * bank, name it, or take it away. Everything it decides goes to the surrounding <form> as plain
 * fields (`${name}`, `${name}.existing`, `${name}.remove`, `${name}.scale`, `${name}.x`,
 * `${name}.y`, `${name}.alt.en`, `${name}.alt.no`), which src/lib/admin/media.ts reads.
 *
 * Resizing is by gesture, never a slider: pinch on a touch screen or a trackpad, scroll to move,
 * and on a pointer screen the corners of the picture are handles that drag like Figma's. The
 * scale is about the point under the fingers (or the opposite corner), so what you are looking
 * at stays put while the rest grows or shrinks around it.
 */

/** The shape of the box the site draws the picture in; `pad` is the box's margin as fractions of its width and height. */
export type Frame = { aspect: number; fit: "contain" | "cover"; pad?: [number, number] };
/** The shop grid's desktop card: 347 by 258, the photo whole inside a 24/42px margin. */
export const PRODUCT_FRAME: Frame = { aspect: 347 / 258, fit: "contain", pad: [24 / 347, 42 / 258] };
export const PORTRAIT_FRAME: Frame = { aspect: 4 / 5, fit: "cover" };
export const WIDE_FRAME: Frame = { aspect: 16 / 9, fit: "cover" };

export type CurrentMedia = { _ref: string; url: string; filename?: string | null; alt?: LocalizedString | null; scale?: number | null; x?: number | null; y?: number | null } | null | undefined;

type T = { scale: number; x: number; y: number };
const DEFAULT_T: T = { scale: 1, x: 0, y: 0 };
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const clampT = (t: T): T => ({ scale: clamp(t.scale, SCALE_MIN, SCALE_MAX), x: clamp(t.x, -SHIFT_MAX, SHIFT_MAX), y: clamp(t.y, -SHIFT_MAX, SHIFT_MAX) });
const fromCurrent = (c: CurrentMedia): T => clampT({ scale: typeof c?.scale === "number" && c.scale > 0 ? c.scale / 100 : 1, x: c?.x ?? 0, y: c?.y ?? 0 });
const toTransform = (t: T): MediaTransform => ({ scale: t.scale, x: t.x, y: t.y });

export default function MediaEditor({
  name,
  label,
  kind = "image",
  current,
  placeholder,
  placeholderNote = "Built-in — in use now. Replace it to use your own.",
  dark = false,
  hint,
  frame = PORTRAIT_FRAME,
  crop = true,
  alt: withAlt = true,
  accept,
}: {
  name: string;
  label: string;
  kind?: "image" | "video";
  current?: CurrentMedia;
  /** What the site uses when nothing is uploaded, so the field never looks empty while something is in use. */
  placeholder?: string;
  placeholderNote?: string;
  /** Frame a white-on-transparent picture on black so it can be seen. */
  dark?: boolean;
  hint?: string;
  frame?: Frame;
  /** False for pictures the site never crops (the logo, the icons): no handles, no gestures. */
  crop?: boolean;
  /** False for fields without a name/alt text of their own. */
  alt?: boolean;
  accept?: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState(current?._ref ?? "");
  const [src, setSrc] = useState<string | null>(current?.url ?? null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [t, setT] = useState<T>(() => fromCurrent(current));
  const [altEn, setAltEn] = useState(getText(current?.alt ?? undefined, "en"));
  const [altNo, setAltNo] = useState(getText(current?.alt ?? undefined, "no"));
  const [initial] = useState(() => fromCurrent(current));

  // A file chosen in the hidden input: preview it straight away; the server uploads it on save.
  const onFile = () => {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    setSrc(URL.createObjectURL(file));
    setFileName(file.name);
    setRemoved(false);
    setT(DEFAULT_T);
  };
  const pick = (asset: PickableAsset) => {
    if (fileInput.current) fileInput.current.value = "";
    setFileName(null);
    setRef(asset._id);
    setSrc(asset.url);
    setRemoved(false);
    setT(DEFAULT_T);
  };
  const remove = () => {
    if (fileInput.current) fileInput.current.value = "";
    setFileName(null);
    setRemoved(true);
  };
  const restore = () => {
    setRemoved(false);
    if (!fileName) {
      setRef(current?._ref ?? "");
      setSrc(current?.url ?? null);
    }
  };

  const shown = removed ? null : (src ?? placeholder ?? null);
  const isPlaceholder = !removed && !src && !!placeholder;
  const summary = removed ? "Will be removed when you save." : fileName ? `New file: ${fileName}` : ref && ref !== current?._ref ? "Chosen from the media bank." : isPlaceholder ? placeholderNote : (current?.filename ?? (withAlt && (altEn || altNo) ? altEn || altNo : null));
  const accepts = accept ?? (kind === "image" ? "image/*" : "video/mp4,video/webm");

  return (
    <div className="flex flex-col gap-[6px]">
      <span className="font-gotham text-[11px] leading-normal tracking-[0.2em] uppercase text-black/50">{label}</span>
      <div className="flex gap-[12px]">
        <button type="button" onClick={() => setOpen(true)} aria-label={`Edit ${label}`} className="w-[160px] shrink-0 cursor-pointer text-left">
          <Preview src={shown} kind={kind} frame={frame} t={isPlaceholder ? DEFAULT_T : t} dark={dark} className="w-full" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-[8px] font-gotham text-paragraph text-black">
          {summary && <span className="text-[11px] leading-normal text-black/50">{summary}</span>}
          {!shown && !summary && <span className="text-[11px] leading-normal text-black/50">Nothing here yet.</span>}
          {crop && shown && !isPlaceholder && !isDefaultTransform(toTransform(t)) && <span className="text-[11px] leading-normal text-black/50">Scaled to {Math.round(t.scale * 100)}%{t.x || t.y ? ", moved" : ""}.</span>}
          <button type="button" onClick={() => setOpen(true)} className="border border-black px-[12px] py-[8px] text-paragraph text-black transition-colors hover:bg-black hover:text-white">
            Edit
          </button>
          {hint && <span className="text-[11px] leading-normal text-black/50">{hint}</span>}
        </div>
      </div>

      {/* The form's view of this field. The file input is always mounted, so a chosen file survives the editor closing. */}
      <input ref={fileInput} type="file" name={name} accept={accepts} onChange={onFile} className="hidden" tabIndex={-1} />
      <input type="hidden" name={`${name}.existing`} value={removed ? "" : ref} />
      <input type="hidden" name={`${name}.remove`} value={removed ? "on" : ""} />
      {crop && (
        <>
          <input type="hidden" name={`${name}.scale`} value={Math.round(t.scale * 100)} />
          <input type="hidden" name={`${name}.x`} value={Math.round(t.x * 10) / 10} />
          <input type="hidden" name={`${name}.y`} value={Math.round(t.y * 10) / 10} />
        </>
      )}
      {withAlt && (
        <>
          <input type="hidden" name={`${name}.alt.en`} value={altEn} />
          <input type="hidden" name={`${name}.alt.no`} value={altNo} />
        </>
      )}

      {open && (
        <EditDialog
          label={label}
          kind={kind}
          src={shown}
          isPlaceholder={isPlaceholder}
          removed={removed}
          frame={frame}
          crop={crop && !isPlaceholder}
          t={t}
          setT={(next) => setT(clampT(next))}
          initial={initial}
          alt={withAlt ? { en: altEn, no: altNo, setEn: setAltEn, setNo: setAltNo } : null}
          onUpload={() => fileInput.current?.click()}
          onPick={pick}
          onRemove={remove}
          onRestore={restore}
          onClose={() => setOpen(false)}
          canRemove={!!src}
        />
      )}
    </div>
  );
}

/* --- The box the site draws the picture in, with the picture inside at its current transform. --- */
function Preview({
  src,
  kind,
  frame,
  t,
  dark,
  className = "",
  children,
  frameRef,
  onLoad,
  style,
}: {
  src: string | null;
  kind: "image" | "video";
  frame: Frame;
  t: T;
  dark: boolean;
  className?: string;
  children?: ReactNode;
  frameRef?: React.Ref<HTMLDivElement>;
  onLoad?: (aspect: number) => void;
  style?: CSSProperties;
}) {
  const [padX, padY] = frame.pad ?? [0, 0];
  return (
    <div ref={frameRef} className={`relative overflow-hidden ${dark ? "bg-black" : "bg-[#f7f7f7]"} ${className}`} style={{ aspectRatio: String(frame.aspect), ...style }}>
      <div className="absolute" style={{ left: `${padX * 100}%`, right: `${padX * 100}%`, top: `${padY * 100}%`, bottom: `${padY * 100}%` }}>
        <div className="relative h-full w-full" style={mediaStyle(toTransform(t))}>
          {src && kind === "image" && (
            // eslint-disable-next-line @next/next/no-img-element -- object URLs and natural size; the site itself uses next/image
            <img src={src} alt="" draggable={false} onLoad={(e) => onLoad?.(e.currentTarget.naturalWidth / Math.max(1, e.currentTarget.naturalHeight))} className={`absolute inset-0 h-full w-full select-none ${frame.fit === "contain" ? "object-contain" : "object-cover"}`} />
          )}
          {src && kind === "video" && <video src={src} muted loop autoPlay playsInline onLoadedMetadata={(e) => onLoad?.(e.currentTarget.videoWidth / Math.max(1, e.currentTarget.videoHeight))} className={`absolute inset-0 h-full w-full ${frame.fit === "contain" ? "object-contain" : "object-cover"}`} />}
        </div>
      </div>
      {!src && <span className="absolute inset-0 flex items-center justify-center font-gotham text-[11px] text-black/50">{kind === "image" ? "No photo" : "No video"}</span>}
      {children}
    </div>
  );
}

/* --- The edit view --- */
type Pt = { x: number; y: number };
type Corner = "tl" | "tr" | "bl" | "br";
type Gesture =
  | { kind: "pan"; id: number; last: Pt }
  | { kind: "corner"; id: number; corner: Corner; opposite: Pt; start: Pt; t0: T }
  | { kind: "pinch"; d0: number; m0: Pt; t0: T };

function EditDialog({
  label,
  kind,
  src,
  isPlaceholder,
  removed,
  frame,
  crop,
  t,
  setT,
  initial,
  alt,
  onUpload,
  onPick,
  onRemove,
  onRestore,
  onClose,
  canRemove,
}: {
  label: string;
  kind: "image" | "video";
  src: string | null;
  isPlaceholder: boolean;
  removed: boolean;
  frame: Frame;
  crop: boolean;
  t: T;
  setT: (t: T) => void;
  initial: T;
  alt: { en: string; no: string; setEn: (v: string) => void; setNo: (v: string) => void } | null;
  onUpload: () => void;
  onPick: (a: PickableAsset) => void;
  onRemove: () => void;
  onRestore: () => void;
  onClose: () => void;
  canRemove: boolean;
}) {
  const frameEl = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const gesture = useRef<Gesture | null>(null);
  // Every pointer currently down on the frame, by id; two of them make a pinch.
  const pointers = useRef(new Map<number, Pt>());
  // The latest transform for the gesture handlers, which run between renders.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  // The frame's size on screen; everything else about the geometry is arithmetic on it.
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = frameEl.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [picker, setPicker] = useState<{ open: boolean; assets: PickableAsset[] | null; error?: string }>({ open: false, assets: null });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  /* Geometry, all in pixels of the frame. The layer is the padded box; the picture's visual box is
     the layer scaled about its centre and shifted; the picture itself fills it (cover) or sits whole inside it (contain). */
  const geometryFor = useCallback(
    (cur: T) => {
      if (!size) return null;
      const [padX, padY] = frame.pad ?? [0, 0];
      const box = { w: size.w * (1 - 2 * padX), h: size.h * (1 - 2 * padY), cx: size.w / 2, cy: size.h / 2 };
      const center = { x: box.cx + (cur.x / 100) * box.w, y: box.cy + (cur.y / 100) * box.h };
      const vw = box.w * cur.scale;
      const vh = box.h * cur.scale;
      let iw = vw;
      let ih = vh;
      if (frame.fit === "contain" && aspect) {
        iw = Math.min(vw, vh * aspect);
        ih = iw / aspect;
      }
      return { frame: { width: size.w, height: size.h }, box, center, image: { x: center.x - iw / 2, y: center.y - ih / 2, w: iw, h: ih } };
    },
    [size, aspect, frame.fit, frame.pad],
  );
  const geometry = useCallback(() => geometryFor(tRef.current), [geometryFor]);

  const local = (e: { clientX: number; clientY: number }): Pt => {
    const f = frameEl.current!.getBoundingClientRect();
    return { x: e.clientX - f.left, y: e.clientY - f.top };
  };
  /** Scale by `ratio` about the frame point `p`, keeping what is under `p` where it is. */
  const zoomAbout = (p: Pt, ratio: number, from: T) => {
    const g = geometry();
    if (!g) return;
    const next = clamp(from.scale * ratio, SCALE_MIN, SCALE_MAX);
    const r = next / from.scale;
    const center = { x: g.box.cx + (from.x / 100) * g.box.w, y: g.box.cy + (from.y / 100) * g.box.h };
    const moved = { x: p.x + (center.x - p.x) * r, y: p.y + (center.y - p.y) * r };
    setT({ scale: next, x: ((moved.x - g.box.cx) / g.box.w) * 100, y: ((moved.y - g.box.cy) / g.box.h) * 100 });
  };
  const panBy = (dx: number, dy: number, from: T) => {
    const g = geometry();
    if (!g) return;
    setT({ ...from, x: from.x + (dx / g.box.w) * 100, y: from.y + (dy / g.box.h) * 100 });
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!crop || !src) return;
    e.preventDefault();
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    // Capture on the element that owns these handlers, so the move and release reach them wherever the pointer goes.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* a pointer the browser doesn't know (synthetic events): the moves still arrive while it stays over the frame */
    }
    if (pointers.current.size >= 2) {
      // A second finger: from moving (or resizing) to pinching, about where the fingers are now.
      const [a, b] = [...pointers.current.values()].slice(-2);
      gesture.current = { kind: "pinch", d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, t0: tRef.current };
      return;
    }
    const corner = (e.target as HTMLElement).dataset.handle as Corner | undefined;
    const g = geometry();
    if (corner && g) {
      const { image } = g;
      const opposite = { x: corner.includes("l") ? image.x + image.w : image.x, y: corner.includes("t") ? image.y + image.h : image.y };
      gesture.current = { kind: "corner", id: e.pointerId, corner, opposite, start: p, t0: tRef.current };
      return;
    }
    gesture.current = { kind: "pan", id: e.pointerId, last: p };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const cur = gesture.current;
    if (!cur || !pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (cur.kind === "pan" && cur.id === e.pointerId) {
      panBy(p.x - cur.last.x, p.y - cur.last.y, tRef.current);
      cur.last = p;
    } else if (cur.kind === "corner" && cur.id === e.pointerId) {
      const d0 = Math.hypot(cur.start.x - cur.opposite.x, cur.start.y - cur.opposite.y) || 1;
      const d = Math.hypot(p.x - cur.opposite.x, p.y - cur.opposite.y);
      zoomAbout(cur.opposite, d / d0, cur.t0);
    } else if (cur.kind === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()].slice(-2);
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      // Scale about where the fingers started, then follow their midpoint.
      const g = geometry();
      if (!g) return;
      const next = clamp(cur.t0.scale * (d / cur.d0), SCALE_MIN, SCALE_MAX);
      const r = next / cur.t0.scale;
      const center0 = { x: g.box.cx + (cur.t0.x / 100) * g.box.w, y: g.box.cy + (cur.t0.y / 100) * g.box.h };
      const center = { x: cur.m0.x + (center0.x - cur.m0.x) * r + (m.x - cur.m0.x), y: cur.m0.y + (center0.y - cur.m0.y) * r + (m.y - cur.m0.y) };
      setT({ scale: next, x: ((center.x - g.box.cx) / g.box.w) * 100, y: ((center.y - g.box.cy) / g.box.h) * 100 });
    }
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    const cur = gesture.current;
    if (!cur) return;
    if (cur.kind === "pinch") {
      // One finger left: carry on as a plain move from where it is.
      const [rest] = [...pointers.current.entries()];
      gesture.current = rest ? { kind: "pan", id: rest[0], last: rest[1] } : null;
      return;
    }
    if (cur.id === e.pointerId || e.type === "pointercancel") gesture.current = null;
  };

  // Wheel: a trackpad pinch (ctrlKey) scales about the pointer; a plain two-finger scroll moves. Not passive, so the page itself stays still.
  useEffect(() => {
    const el = frameEl.current;
    if (!el || !crop) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = { x: e.clientX - el.getBoundingClientRect().left, y: e.clientY - el.getBoundingClientRect().top };
      if (e.ctrlKey || e.metaKey) zoomAbout(p, Math.exp(-e.deltaY * 0.01), tRef.current);
      else panBy(-e.deltaX, -e.deltaY, tRef.current);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- zoomAbout/panBy read the latest transform through tRef; size and aspect are what change the geometry
  }, [crop, size, aspect]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!crop) return;
    const step = e.shiftKey ? 10 : 1;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      panBy(...moves[e.key], tRef.current);
    } else if (e.key === "+" || e.key === "=") zoomAbout(centerOfFrame(), 1.1, tRef.current);
    else if (e.key === "-") zoomAbout(centerOfFrame(), 1 / 1.1, tRef.current);
  };
  const centerOfFrame = (): Pt => ({ x: (size?.w ?? 0) / 2, y: (size?.h ?? 0) / 2 });

  /** Fill: the picture covers the whole frame, margin included, centred. Fit: back to the usual fit. */
  const fill = () => {
    const g = geometry();
    if (!g) return;
    const base = { scale: 1, x: 0, y: 0 };
    let iw = g.box.w;
    let ih = g.box.h;
    if (frame.fit === "contain" && aspect) {
      iw = Math.min(g.box.w, g.box.h * aspect);
      ih = iw / aspect;
    }
    setT({ ...base, scale: clamp(Math.max(g.frame.width / iw, g.frame.height / ih), SCALE_MIN, SCALE_MAX) });
  };

  const openPicker = async () => {
    setPicker((p) => ({ ...p, open: true }));
    if (picker.assets) return;
    try {
      setPicker({ open: true, assets: await pickableMedia(kind) });
    } catch {
      setPicker({ open: true, assets: [], error: "Couldn't load the media bank." });
    }
  };

  const g = geometryFor(t);
  const handles: { corner: Corner; x: number; y: number }[] = g && crop && src ? [
    { corner: "tl", x: g.image.x, y: g.image.y },
    { corner: "tr", x: g.image.x + g.image.w, y: g.image.y },
    { corner: "bl", x: g.image.x, y: g.image.y + g.image.h },
    { corner: "br", x: g.image.x + g.image.w, y: g.image.y + g.image.h },
  ] : [];

  const btn = "border border-black px-[12px] py-[8px] font-gotham text-paragraph text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30";
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Edit ${label}`} className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 p-[12px] md:p-[42px]" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="my-auto flex w-full max-w-[960px] flex-col gap-[24px] bg-white p-[24px] font-gotham text-paragraph text-black shadow-[0_24px_80px_rgba(0,0,0,0.25)] md:p-[42px]">
        <div className="flex items-start justify-between gap-[24px]">
          <div className="flex flex-col gap-[6px]">
            <h2 className="m-0 font-americana text-[24px] leading-none capitalize">{label}</h2>
            <span className="text-[11px] leading-normal text-black/50">
              {crop ? "Drag to move. Pinch, or hold ⌘/Ctrl and scroll, to resize; or pull a corner. Arrow keys nudge." : "This picture is never cropped by the site, so there is nothing to move here."}
            </span>
          </div>
          <button type="button" onClick={onClose} className={btn}>
            Done
          </button>
        </div>

        <div className="grid gap-[24px] md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex flex-col gap-[12px]">
            <div className="touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-black/30" tabIndex={crop ? 0 : -1} onKeyDown={onKeyDown}>
              <Preview
                src={removed ? null : src}
                kind={kind}
                frame={frame}
                t={t}
                dark={false}
                frameRef={frameEl}
                onLoad={setAspect}
                className={`w-full ${crop && src && !removed ? "cursor-grab active:cursor-grabbing" : ""}`}
              >
                {/* Pointer events on the frame itself: picture, margin and handles alike. */}
                {crop && src && !removed && (
                  <div className="absolute inset-0" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
                    {g && (
                      <div aria-hidden className="pointer-events-none absolute border border-white/90 mix-blend-difference" style={{ left: g.image.x, top: g.image.y, width: g.image.w, height: g.image.h }} />
                    )}
                    {handles.map((h) => (
                      <div
                        key={h.corner}
                        data-handle={h.corner}
                        role="presentation"
                        className={`absolute h-[12px] w-[12px] -translate-x-1/2 -translate-y-1/2 border border-black bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.9)] ${h.corner === "tl" || h.corner === "br" ? "cursor-nwse-resize" : "cursor-nesw-resize"}`}
                        style={{ left: h.x, top: h.y }}
                      />
                    ))}
                  </div>
                )}
              </Preview>
            </div>
            {crop && (
              <div className="flex flex-wrap items-center gap-[12px]">
                <button type="button" onClick={() => setT(DEFAULT_T)} className={btn} disabled={!src || removed}>
                  Fit
                </button>
                <button type="button" onClick={fill} className={btn} disabled={!src || removed || (frame.fit === "contain" && !aspect)}>
                  Fill
                </button>
                <button type="button" onClick={() => setT(initial)} className={btn} disabled={!src || removed}>
                  Undo changes
                </button>
                <span className="text-[11px] leading-normal text-black/50">
                  {Math.round(t.scale * 100)}% · {Math.round(t.x)}, {Math.round(t.y)}
                </span>
              </div>
            )}
            {isPlaceholder && <span className="text-[11px] leading-normal text-black/50">This is the site&apos;s built-in picture. Replace it to use your own; the built-in one can&apos;t be moved.</span>}
          </div>

          <div className="flex flex-col gap-[24px]">
            <div className="flex flex-col gap-[12px]">
              <span className="text-[11px] leading-normal tracking-[0.2em] uppercase text-black/50">Replace</span>
              <button type="button" onClick={onUpload} className={btn}>
                Upload a new {kind === "image" ? "photo" : "video"}
              </button>
              <button type="button" onClick={openPicker} className={btn}>
                Choose from media
              </button>
              {canRemove && !removed && !isPlaceholder && (
                <button type="button" onClick={onRemove} className="text-left text-[11px] leading-normal text-black/50 underline">
                  Remove this {kind === "image" ? "photo" : "video"}
                </button>
              )}
              {removed && (
                <button type="button" onClick={onRestore} className="text-left text-[11px] leading-normal text-black/50 underline">
                  Keep it after all
                </button>
              )}
            </div>
            {alt && (
              <div className="flex flex-col gap-[12px]">
                <span className="text-[11px] leading-normal tracking-[0.2em] uppercase text-black/50">Name</span>
                <label className="flex flex-col gap-[6px] text-[11px] text-black/50">
                  English
                  <input value={alt.en} onChange={(e) => alt.setEn(e.target.value)} placeholder="What the picture shows" className="h-[44px] w-full border border-black/20 bg-transparent px-[12px] font-gotham text-paragraph text-black outline-none focus:border-black" />
                </label>
                <label className="flex flex-col gap-[6px] text-[11px] text-black/50">
                  Norwegian
                  <input value={alt.no} onChange={(e) => alt.setNo(e.target.value)} placeholder="Hva bildet viser" className="h-[44px] w-full border border-black/20 bg-transparent px-[12px] font-gotham text-paragraph text-black outline-none focus:border-black" />
                </label>
                <span className="text-[11px] leading-normal text-black/50">Read out by screen readers and used by search engines. Not shown on the page.</span>
              </div>
            )}
          </div>
        </div>

        {picker.open && (
          <div className="flex flex-col gap-[12px] border-t border-black/25 pt-[24px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] leading-normal tracking-[0.2em] uppercase text-black/50">Media bank</span>
              <button type="button" onClick={() => setPicker((p) => ({ ...p, open: false }))} className="text-[11px] text-black/50 underline">
                Close
              </button>
            </div>
            {picker.error && <span className="text-[11px] text-[#b00020]">{picker.error}</span>}
            {!picker.assets && !picker.error && <span className="text-[11px] text-black/50">Loading…</span>}
            {picker.assets && picker.assets.length === 0 && !picker.error && <span className="text-[11px] text-black/50">Nothing uploaded yet. Upload from here, or under Media.</span>}
            {picker.assets && picker.assets.length > 0 && (
              <ul className="m-0 grid max-h-[360px] list-none grid-cols-3 gap-[12px] overflow-y-auto p-0 md:grid-cols-6">
                {picker.assets.map((a) => (
                  <li key={a._id}>
                    <button type="button" onClick={() => { onPick(a); setPicker((p) => ({ ...p, open: false })); }} className="flex w-full flex-col gap-[4px] text-left">
                      <span className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden bg-[#f7f7f7]">
                        {kind === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element -- the media bank's own URLs, shown small
                          <img src={`${a.url}?w=240&q=60&auto=format`} alt="" className="absolute inset-0 h-full w-full object-contain p-[8px]" />
                        ) : (
                          <video src={a.url} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="truncate text-[11px] leading-normal text-black/50" title={a.filename ?? undefined}>
                        {a.filename ?? a._id}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
