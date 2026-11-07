"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Muted, Subheading } from "@/components/admin/ui";
import { canExportVideo, FORMATS, recordVideo, renderStill, type ExportOptions, type Format, type Progress } from "@/lib/instagram-video";
import { formatNok } from "@/lib/money";
import type { VintageCardSetting } from "@/lib/vintage-card-shared";

/*
 * "Export for Instagram" for each vintage piece: a loop of the piece turning once, with its words,
 * as an MP4 ready to post. The piece is chosen from the list; the options and a still of the first
 * frame appear under it; Export renders every frame in the browser (a progress bar shows it working)
 * and then downloads the file.
 */
export type ExportablePiece = { slug: string; name: { en: string; no: string }; priceOre: number; src: string; alt: string };

type Options = { format: Format; seconds: number; lang: "en" | "no"; dark: boolean; showTop: boolean; top: string; showTitle: boolean; showPrice: boolean; grain: boolean };
const SECONDS = [6, 8, 10, 12];

function Choice<T extends string | number>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <fieldset className="m-0 flex flex-col gap-[6px] border-0 p-0">
      <legend className="mb-[6px] font-gotham text-[11px] leading-normal text-black">{label}</legend>
      <div className="flex flex-wrap gap-[8px]">
        {options.map((o) => (
          <label key={String(o.value)} className="flex cursor-pointer items-center gap-[8px] border border-black/20 px-[12px] py-[8px] font-gotham text-paragraph text-black has-[:checked]:border-black">
            <input type="radio" checked={value === o.value} onChange={() => onChange(o.value)} className="h-[14px] w-[14px] accent-black" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Tick({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-[8px] font-gotham text-paragraph text-black">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-[14px] w-[14px] accent-black" />
      {label}
    </label>
  );
}

function PieceExport({ piece, setting, oneOfAKind }: { piece: ExportablePiece; setting: VintageCardSetting; oneOfAKind: { en: string; no: string } }) {
  const [o, setO] = useState<Options>({ format: "reel", seconds: 8, lang: "en", dark: false, showTop: true, top: oneOfAKind.en, showTitle: true, showPrice: true, grain: true });
  const [still, setStill] = useState<string | null>(null);
  const [stillBusy, setStillBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<{ url: string; name: string } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const supported = canExportVideo();

  const exportOptions = (): ExportOptions => ({
    src: piece.src,
    setting,
    dark: o.dark,
    format: o.format,
    seconds: o.seconds,
    top: o.showTop ? o.top : undefined,
    title: o.showTitle ? piece.name[o.lang] || piece.name.en : undefined,
    price: o.showPrice ? formatNok(piece.priceOre) : undefined,
    grain: o.grain,
  });

  // A still of the first frame, redrawn a moment after the options settle.
  const optionsKey = JSON.stringify(o);
  useEffect(() => {
    let gone = false;
    const id = setTimeout(async () => {
      setStillBusy(true);
      try {
        const url = await renderStill(exportOptions());
        if (!gone) setStill(url);
      } catch {
        /* the preview is a convenience; the export reports its own errors */
      } finally {
        if (!gone) setStillBusy(false);
      }
    }, 350);
    return () => {
      gone = true;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey, piece.src, setting]);

  const start = async () => {
    setError(null);
    setFile(null);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const blob = await recordVideo(exportOptions(), setProgress, ctrl.signal);
      const name = `${piece.slug}-${o.format}-${o.seconds}s.mp4`;
      const url = URL.createObjectURL(blob);
      setFile({ url, name });
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "The export failed.");
    } finally {
      setProgress(null);
      abort.current = null;
    }
  };
  useEffect(() => () => abort.current?.abort(), []);

  const busy = progress !== null;
  const percent = progress ? (progress.phase === "preparing" ? 0 : progress.phase === "done" ? 100 : Math.round((progress.done / progress.total) * 100)) : 0;
  const phaseText = progress ? { preparing: "Loading the photo and fonts…", rendering: `Drawing frame ${progress.done} of ${progress.total}…`, encoding: "Making the video file…", done: "Done." }[progress.phase] : "";
  const { width, height } = FORMATS[o.format];

  return (
    <div className="grid gap-[24px] md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
      <div className="flex flex-col gap-[24px]">
        <Choice label="Format" options={(Object.keys(FORMATS) as Format[]).map((f) => ({ value: f, label: FORMATS[f].label }))} value={o.format} onChange={(format) => setO({ ...o, format })} />
        <Choice label="Length · one full turn" options={SECONDS.map((s) => ({ value: s, label: `${s} s` }))} value={o.seconds} onChange={(seconds) => setO({ ...o, seconds })} />
        <Choice label="Background" options={[{ value: "white", label: "White" }, { value: "dark", label: "Dark" }]} value={o.dark ? "dark" : "white"} onChange={(v) => setO({ ...o, dark: v === "dark" })} />
        <Choice label="Language" options={[{ value: "en", label: "English" }, { value: "no", label: "Norsk" }]} value={o.lang} onChange={(lang) => setO({ ...o, lang, top: o.top === oneOfAKind[o.lang] ? oneOfAKind[lang] : o.top })} />
        <fieldset className="m-0 flex flex-col gap-[10px] border-0 p-0">
          <legend className="mb-[6px] font-gotham text-[11px] leading-normal text-black">Words on the video</legend>
          <div className="flex flex-col gap-[6px]">
            <Tick label="Line above the name" checked={o.showTop} onChange={(showTop) => setO({ ...o, showTop })} />
            {o.showTop && <input value={o.top} onChange={(e) => setO({ ...o, top: e.target.value })} maxLength={40} className="w-full border border-black/20 bg-white px-[12px] py-[8px] font-gotham text-paragraph text-black outline-none focus:border-black md:max-w-[320px]" />}
          </div>
          <Tick label={`Name · ${piece.name[o.lang] || piece.name.en}`} checked={o.showTitle} onChange={(showTitle) => setO({ ...o, showTitle })} />
          <Tick label={`Price · ${formatNok(piece.priceOre)}`} checked={o.showPrice} onChange={(showPrice) => setO({ ...o, showPrice })} />
          <Tick label="Film grain" checked={o.grain} onChange={(grain) => setO({ ...o, grain })} />
        </fieldset>

        <div className="flex flex-col gap-[12px]">
          {!supported && <Muted>This browser can&apos;t make videos. Open the dashboard in Chrome, Edge or Safari on a computer.</Muted>}
          {busy ? (
            <div className="flex flex-col gap-[10px]">
              <div className="flex items-center gap-[12px] font-gotham text-paragraph text-black">
                <span aria-hidden className="inline-block h-[14px] w-[14px] animate-spin rounded-full border-2 border-black/20 border-t-black" />
                <span aria-live="polite">{phaseText}</span>
                <span className="ml-auto tabular-nums text-black/50">{percent}%</span>
              </div>
              <div className="h-[6px] w-full overflow-hidden bg-black/10" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-black transition-[width] duration-150" style={{ width: `${percent}%` }} />
              </div>
              <Muted>{`${width} × ${height}, ${o.seconds} seconds, 30 frames a second. Keep this tab open; it usually takes well under a minute.`}</Muted>
              <Button type="button" className="md:max-w-[200px]" onClick={() => abort.current?.abort()}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-[12px]">
              <Button type="button" className="md:max-w-[280px]" onClick={start} disabled={!supported}>
                Export for Instagram
              </Button>
              {file && (
                <a href={file.url} download={file.name} className="font-gotham text-paragraph text-black underline underline-offset-4 hover:opacity-70">
                  Download {file.name} again
                </a>
              )}
            </div>
          )}
          {file && !busy && <Muted>Saved as {file.name}. It loops: the last frame leads straight into the first.</Muted>}
          {error && <p className="m-0 font-gotham text-paragraph text-[#b00020]">{error}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-[10px]">
        <Subheading>First frame</Subheading>
        <div className="relative w-full overflow-hidden bg-black/5" style={{ aspectRatio: `${width} / ${height}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {still && <img src={still} alt="" className="absolute inset-0 h-full w-full object-contain" />}
          {stillBusy && (
            <div className="absolute top-[8px] right-[8px] flex items-center gap-[6px] bg-white/80 px-[8px] py-[4px] font-gotham text-[11px] text-black">
              <span aria-hidden className="inline-block h-[10px] w-[10px] animate-spin rounded-full border-2 border-black/20 border-t-black" />
              Drawing…
            </div>
          )}
        </div>
        <Muted>The video is {width} × {height}. The piece turns once and lands exactly where it started.</Muted>
      </div>
    </div>
  );
}

export default function InstagramExport({ pieces, setting, oneOfAKind }: { pieces: ExportablePiece[]; setting: VintageCardSetting; oneOfAKind: { en: string; no: string } }) {
  const [open, setOpen] = useState<string | null>(null);
  if (pieces.length === 0) return <Muted>No vintage pieces with a photo yet. Tick &quot;Vintage piece&quot; on a product and give it a photo.</Muted>;
  return (
    <div className="flex flex-col gap-[12px]">
      {pieces.map((p) => (
        <Card key={p.slug}>
          <div className="flex flex-col gap-[24px]">
            <div className="flex items-center gap-[16px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${p.src}?w=120&h=160&fit=crop&auto=format`} alt="" className="h-[80px] w-[60px] shrink-0 object-cover" />
              <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="truncate font-gotham text-paragraph text-black">{p.name.en}</span>
                <span className="font-gotham text-[11px] leading-normal text-black/50">{formatNok(p.priceOre)}</span>
              </div>
              <Button type="button" className="md:max-w-[220px]" onClick={() => setOpen(open === p.slug ? null : p.slug)}>
                {open === p.slug ? "Close" : "Export for Instagram"}
              </Button>
            </div>
            {open === p.slug && <PieceExport piece={p} setting={setting} oneOfAKind={oneOfAKind} />}
          </div>
        </Card>
      ))}
    </div>
  );
}
