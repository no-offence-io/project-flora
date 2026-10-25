"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { deleteNewsletter, duplicateNewsletter, listImages, previewNewsletter, saveNewsletter, sendNewsletterAll, sendNewsletterTest, uploadPickerImage } from "@/app/admin/(app)/newsletters/actions";
import { FIELD } from "@/components/admin/ui";
import { BLOCK_LABELS, newBlock, type Block, type BlockKind, type L } from "@/lib/newsletter-blocks";

/*
 * The newsletter builder. Left: the blocks in order, dragged by their handle (or nudged with the
 * arrows), each opening to its fields in both languages. Right: the mail itself, rendered by the
 * server with the same code that sends it, refreshed as you type. Everything is in the admin's
 * own type and colours; the only new thing is the drag.
 */
export type EditorProduct = { _id: string; name?: string; priceOre?: number; image?: string; gif?: string };
export type EditorDoc = { _id: string; subjectEn?: string; subjectNo?: string; blocks: Block[]; status?: string; sentAt?: string; sentCount?: number; testSentAt?: string };

const nok = (ore?: number) => `${Math.round((ore ?? 0) / 100).toLocaleString("nb-NO")} kr`;
const SMALL_LABEL = "font-gotham text-[11px] leading-normal text-black";
const LINK = "font-gotham text-[11px] text-black underline hover:opacity-70 transition-opacity disabled:opacity-40";
const MUTED_LINK = "font-gotham text-[11px] text-black/50 underline hover:text-black transition-colors disabled:opacity-40";
const BUTTON = "flex items-center justify-center bg-black px-[24px] py-[12px] font-gotham text-paragraph text-white hover:opacity-80 transition-opacity disabled:cursor-not-allowed disabled:opacity-50";

export default function NewsletterEditor({ doc, products, subscribers, email, mailReady, initialBlocks }: { doc: EditorDoc | null; products: EditorProduct[]; subscribers: number; email: string; mailReady: boolean; initialBlocks: Block[] }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(doc?._id ?? null);
  const [subject, setSubject] = useState<L>({ en: doc?.subjectEn ?? "", no: doc?.subjectNo ?? "" });
  const [blocks, setBlocks] = useState<Block[]>(doc?.blocks.length ? doc.blocks : initialBlocks);
  const [open, setOpen] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id?: string; kind?: BlockKind } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "no">("en");
  const [width, setWidth] = useState<600 | 375>(600);
  const [html, setHtml] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [sure, setSure] = useState(false);
  const [picker, setPicker] = useState<{ onPick: (url: string) => void } | null>(null);
  const sent = doc?.status === "sent";

  // Preview: debounced round-trip to the server renderer.
  const blocksJson = JSON.stringify(blocks);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      previewNewsletter({ blocksJson, lang }).then((r) => {
        if (r.ok) setHtml(r.html);
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [blocksJson, lang]);

  const update = useCallback((next: Block[]) => {
    setBlocks(next);
    setDirty(true);
  }, []);
  const patch = (blockId: string, fn: (b: Block) => Block) => update(blocks.map((b) => (b.id === blockId ? fn(b) : b)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length || from === to) return;
    const next = blocks.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update(next);
  };
  const add = (kind: BlockKind, index?: number) => {
    const b = newBlock(kind);
    const at = index ?? (open ? blocks.findIndex((x) => x.id === open) + 1 : blocks.length);
    const next = blocks.slice();
    next.splice(at, 0, b);
    update(next);
    setOpen(b.id);
  };
  /** A drop on row `i`: an existing block moves there, a palette item is inserted there. */
  const dropAt = (i: number) => {
    if (!dragging) return;
    if (dragging.id) move(blocks.findIndex((x) => x.id === dragging.id), i);
    else if (dragging.kind) add(dragging.kind, i);
    setDragging(null);
    setOver(null);
  };
  const remove = (blockId: string) => {
    update(blocks.filter((b) => b.id !== blockId));
    if (open === blockId) setOpen(null);
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setBusy(null);
    }
  };
  const save = () =>
    run("save", async () => {
      const r = await saveNewsletter({ id, subjectEn: subject.en, subjectNo: subject.no, blocksJson });
      if (!r.ok) return setMessage({ tone: "error", text: r.error });
      setDirty(false);
      setMessage({ tone: "ok", text: "Saved." });
      if (!id) {
        setId(r.id);
        router.replace(`/admin/newsletters/${r.id}`);
      }
    });
  const test = () =>
    run("test", async () => {
      if (dirty || !id) await save();
      const current = id ?? null;
      if (!current) return;
      const r = await sendNewsletterTest({ id: current, lang });
      setMessage(r.ok ? { tone: "ok", text: `Test (${lang === "no" ? "Norsk" : "English"}) sent to ${r.email}.` } : { tone: "error", text: r.error });
    });
  const sendAll = () =>
    run("all", async () => {
      if (!id) return;
      if (dirty) await save();
      const r = await sendNewsletterAll({ id });
      if (r.ok) {
        setMessage({ tone: "ok", text: `Sent to ${r.count} subscribers.` });
        router.refresh();
      } else setMessage({ tone: "error", text: r.error });
    });

  return (
    <div className="flex flex-col gap-[42px]">
      {/* Subject + actions */}
      <section className="flex flex-col gap-[24px] md:max-w-[1200px]">
        <div className="flex flex-col gap-[12px] md:flex-row md:gap-[24px]">
          <label className="flex min-w-0 flex-1 flex-col gap-[6px]">
            <span className={SMALL_LABEL}>Subject line · English</span>
            <input value={subject.en} onChange={(e) => { setSubject({ ...subject, en: e.target.value }); setDirty(true); }} disabled={sent} className={`${FIELD} truncate`} placeholder="What the inbox shows" />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-[6px]">
            <span className={SMALL_LABEL}>Subject line · Norsk</span>
            <input value={subject.no} onChange={(e) => { setSubject({ ...subject, no: e.target.value }); setDirty(true); }} disabled={sent} className={`${FIELD} truncate`} placeholder="Leave empty to use English" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-[12px]">
          {!sent && (
            <button type="button" onClick={save} disabled={busy !== null} className={BUTTON}>
              {busy === "save" ? "Saving…" : dirty ? "Save" : "Saved"}
            </button>
          )}
          {!sent && (
            <button type="button" onClick={test} disabled={busy !== null || !mailReady} className={`${BUTTON} border border-black bg-transparent text-black`} title={mailReady ? "" : "Email isn't connected — see Setup"}>
              {busy === "test" ? "Sending…" : `Send a test to ${email}`}
            </button>
          )}
          {sent && id && (
            <button type="button" onClick={() => run("dup", async () => { const r = await duplicateNewsletter({ id }); if (r.ok) router.push(`/admin/newsletters/${r.id}`); else setMessage({ tone: "error", text: r.error }); })} disabled={busy !== null} className={BUTTON}>
              Duplicate as a new draft
            </button>
          )}
          {!sent && id && (
            <button type="button" onClick={() => run("del", async () => { if (!window.confirm("Delete this draft?")) return; await deleteNewsletter({ id }); router.push("/admin/newsletters"); })} disabled={busy !== null} className={MUTED_LINK}>
              Delete draft
            </button>
          )}
          {message && (
            <p className={`m-0 font-gotham text-paragraph ${message.tone === "error" ? "text-[#b00020]" : "text-black/50"}`} role="status">
              {message.text}
            </p>
          )}
        </div>
        {sent && (
          <p className="m-0 font-gotham text-paragraph text-black/50">
            Sent {doc?.sentAt ? new Date(doc.sentAt).toLocaleString("nb-NO", { dateStyle: "long", timeStyle: "short" }) : ""} to {doc?.sentCount ?? 0} subscribers. Sent newsletters can&apos;t be changed.
          </p>
        )}
      </section>

      <div className="grid gap-[42px] md:max-w-[1200px] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
        {/* Blocks */}
        <section className="flex flex-col gap-[12px]">
          <div className="flex items-center justify-between">
            <h2 className="m-0 font-gotham text-paragraph text-black">Blocks</h2>
            <span className="font-gotham text-[11px] text-black/50">Drag the ⋮⋮ handle to reorder</span>
          </div>
          <div className="h-px w-full bg-black/25" />
          <ol className="m-0 flex list-none flex-col gap-[6px] p-0">
            {blocks.map((b, i) => (
              <li
                key={b.id}
                draggable={!sent}
                onDragStart={(e) => { setDragging({ id: b.id }); e.dataTransfer.effectAllowed = "move"; }}
                onDragOver={(e) => { e.preventDefault(); setOver(b.id); }}
                onDragLeave={() => setOver((o) => (o === b.id ? null : o))}
                onDrop={(e) => { e.preventDefault(); dropAt(i); }}
                onDragEnd={() => { setDragging(null); setOver(null); }}
                className={`border-[0.25px] border-black/25 bg-white transition-colors ${over === b.id && dragging?.id !== b.id ? "border-t-2 border-t-black bg-[#fafbfc]" : ""} ${dragging?.id === b.id ? "opacity-40" : ""}`}
              >
                <div className="flex items-center gap-[12px] p-[12px] font-gotham text-paragraph text-black">
                  <span aria-hidden className={`select-none text-black/50 ${sent ? "" : "cursor-grab active:cursor-grabbing"}`}>⋮⋮</span>
                  <button type="button" onClick={() => setOpen(open === b.id ? null : b.id)} className="min-w-0 flex-1 truncate text-left">
                    <span>{BLOCK_LABELS[b.kind].label}</span>
                    <span className="text-black/50"> {summary(b, products)}</span>
                  </button>
                  {!sent && (
                    <span className="flex shrink-0 items-center gap-[8px] font-gotham text-[11px]">
                      <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className={MUTED_LINK} aria-label="Move up">▲</button>
                      <button type="button" onClick={() => move(i, i + 1)} disabled={i === blocks.length - 1} className={MUTED_LINK} aria-label="Move down">▼</button>
                      <button type="button" onClick={() => remove(b.id)} className={MUTED_LINK} aria-label="Remove">×</button>
                    </span>
                  )}
                </div>
                {open === b.id && (
                  <div className="flex flex-col gap-[12px] border-t border-black/25 p-[12px]">
                    <BlockFields block={b} products={products} disabled={sent} onChange={(nb) => patch(b.id, () => nb)} pick={(onPick) => setPicker({ onPick })} />
                  </div>
                )}
              </li>
            ))}
          </ol>
          {!sent && (
            <div
              onDragOver={(e) => { e.preventDefault(); setOver("end"); }}
              onDragLeave={() => setOver((o) => (o === "end" ? null : o))}
              onDrop={(e) => { e.preventDefault(); dropAt(blocks.length); }}
              className={`flex items-center justify-center border border-dashed p-[12px] font-gotham text-[11px] transition-colors ${over === "end" ? "border-black bg-[#fafbfc] text-black" : "border-black/25 text-black/50"}`}
            >
              {dragging ? "Drop here to put it last" : "Drag a block here, or onto any row, to place it"}
            </div>
          )}
          {!sent && (
            <div className="flex flex-col gap-[6px] pt-[12px]">
              <span className={SMALL_LABEL}>Add a block — tap to add{open ? " after the open one" : ""}, or drag it into place</span>
              <div className="flex flex-wrap gap-[6px]">
                {(Object.keys(BLOCK_LABELS) as BlockKind[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    draggable
                    onDragStart={(e) => { setDragging({ kind }); e.dataTransfer.effectAllowed = "copy"; }}
                    onDragEnd={() => { setDragging(null); setOver(null); }}
                    onClick={() => add(kind)}
                    title={BLOCK_LABELS[kind].hint}
                    className="cursor-grab border-[0.5px] border-black px-[12px] py-[6px] font-gotham text-paragraph text-black hover:bg-[#f7f7f7] transition-colors active:cursor-grabbing"
                  >
                    + {BLOCK_LABELS[kind].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!sent && id && (
            <div className="mt-[30px] flex flex-col gap-[12px] border-[0.5px] border-black/25 p-[24px]">
              <h2 className="m-0 font-gotham text-paragraph text-black">Send to everyone</h2>
              <div className="h-px w-full bg-black/25" />
              <p className="m-0 font-gotham text-paragraph text-black/50">Goes to all {subscribers} subscribers, each in their own language, with their own unsubscribe link. Send yourself a test first.</p>
              <label className="flex items-center gap-[8px] font-gotham text-paragraph text-black">
                <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="h-[14px] w-[14px] accent-black" /> I have checked the test and want to send to {subscribers} people
              </label>
              <button type="button" onClick={sendAll} disabled={!sure || busy !== null || !mailReady || subscribers === 0} className={`${BUTTON} md:max-w-[320px]`}>
                {busy === "all" ? "Sending…" : "Send to everyone"}
              </button>
            </div>
          )}
        </section>

        {/* Preview */}
        <section className="flex flex-col gap-[12px] md:sticky md:top-[24px]">
          <div className="flex items-center justify-between gap-[12px]">
            <h2 className="m-0 font-gotham text-paragraph text-black">Preview</h2>
            <div className="flex items-center gap-[12px] font-gotham text-paragraph">
              <Toggle value={lang} options={[["en", "EN"], ["no", "NO"]]} onChange={setLang} />
              <Toggle value={width} options={[[600, "Desktop"], [375, "Phone"]]} onChange={setWidth} />
            </div>
          </div>
          <div className="h-px w-full bg-black/25" />
          <div className="flex justify-center bg-[#f7f7f7] p-[12px]">
            <iframe title="Newsletter preview" srcDoc={html} sandbox="" style={{ width, height: "78vh", maxWidth: "100%" }} className="border-0 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)]" />
          </div>
        </section>
      </div>

      {picker && <ImagePicker onClose={() => setPicker(null)} onPick={(url) => { picker.onPick(url); setPicker(null); }} />}
    </div>
  );
}

function summary(b: Block, products: EditorProduct[]): string {
  switch (b.kind) {
    case "kicker": case "heading": case "text": case "quote":
      return b.text.en.slice(0, 60);
    case "image":
      return b.src ? b.src.split("/").pop()?.split("?")[0]?.slice(0, 40) ?? "" : "(no photo yet)";
    case "twoImages":
      return `${b.left.caption.en || "…"} · ${b.right.caption.en || "…"}`;
    case "products":
      return b.ids.length ? b.ids.map((id) => products.find((p) => p._id === id)?.name ?? "?").join(", ") : "(none chosen)";
    case "button":
      return b.label.en;
    case "divider":
      return "";
    case "spacer":
      return `${b.height}px`;
  }
}

function Toggle<T extends string | number>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <span className="flex">
      {options.map(([v, label]) => (
        <button key={String(v)} type="button" onClick={() => onChange(v)} className={`px-[8px] ${v === value ? "text-black" : "text-black/50 hover:text-black transition-colors"}`}>
          {label}
        </button>
      ))}
    </span>
  );
}

function Bi({ label, value, onChange, multiline = false, disabled }: { label: string; value: L; onChange: (v: L) => void; multiline?: boolean; disabled?: boolean }) {
  const cls = `${FIELD} ${multiline ? "resize-y" : "truncate"}`;
  return (
    <div className="flex flex-col gap-[6px]">
      <span className={SMALL_LABEL}>{label}</span>
      <div className="flex flex-col gap-[12px] md:flex-row">
        {(["en", "no"] as const).map((k) => (
          <label key={k} className="flex min-w-0 flex-1 flex-col gap-[6px]">
            <span className="font-gotham text-[11px] text-black/50">{k === "en" ? "English" : "Norsk"}</span>
            {multiline ? (
              <textarea rows={4} value={value[k]} disabled={disabled} onChange={(e) => onChange({ ...value, [k]: e.target.value })} className={cls} placeholder={k === "no" ? "Leave empty to show English" : ""} />
            ) : (
              <input value={value[k]} disabled={disabled} onChange={(e) => onChange({ ...value, [k]: e.target.value })} className={cls} placeholder={k === "no" ? "Leave empty to show English" : ""} />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

function Url({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="flex flex-col gap-[6px]">
      <span className={SMALL_LABEL}>{label}</span>
      <input type="url" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={`${FIELD} truncate`} placeholder="https://" />
    </label>
  );
}

function Photo({ label, src, onChange, pick, disabled }: { label: string; src: string; onChange: (v: string) => void; pick: (onPick: (url: string) => void) => void; disabled?: boolean }) {
  const [hover, setHover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropFile = async (file: File | undefined) => {
    if (!file || disabled) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    const r = await uploadPickerImage(fd);
    if (r.ok) onChange(r.url);
    else setError(r.error);
    setUploading(false);
  };
  return (
    <div className="flex flex-col gap-[6px]">
      <span className={SMALL_LABEL}>{label}</span>
      <div
        onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); e.stopPropagation(); setHover(true); } }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => { if (e.dataTransfer.files?.length) { e.preventDefault(); e.stopPropagation(); setHover(false); dropFile(e.dataTransfer.files[0]); } }}
        className={`flex items-center gap-[12px] border border-dashed p-[6px] transition-colors ${hover ? "border-black bg-[#fafbfc]" : "border-transparent"}`}
      >
        <span className="relative flex h-[90px] w-[72px] shrink-0 items-center justify-center bg-[#f7f7f7]">
          {src ? <Image src={src} alt="" fill sizes="72px" unoptimized className="object-cover" /> : <span className="font-gotham text-[11px] text-black/50">{uploading ? "…" : "None"}</span>}
        </span>
        <div className="flex flex-col gap-[6px]">
          <button type="button" disabled={disabled || uploading} onClick={() => pick(onChange)} className={LINK}>{uploading ? "Uploading…" : src ? "Change photo" : "Choose photo"}</button>
          {src && <button type="button" disabled={disabled} onClick={() => onChange("")} className={MUTED_LINK}>Remove</button>}
          <span className="font-gotham text-[11px] text-black/50">or drop a photo here</span>
          {error && <span className="font-gotham text-[11px] text-[#b00020]">{error}</span>}
        </div>
      </div>
    </div>
  );
}

function BlockFields({ block: b, products, disabled, onChange, pick }: { block: Block; products: EditorProduct[]; disabled: boolean; onChange: (b: Block) => void; pick: (onPick: (url: string) => void) => void }): ReactNode {
  switch (b.kind) {
    case "kicker":
    case "heading":
      return <Bi label={BLOCK_LABELS[b.kind].label} value={b.text} disabled={disabled} onChange={(text) => onChange({ ...b, text })} />;
    case "text":
    case "quote":
      return <Bi label={b.kind === "text" ? "Text — leave an empty line between paragraphs" : "Quote"} value={b.text} multiline disabled={disabled} onChange={(text) => onChange({ ...b, text })} />;
    case "image":
      return (
        <>
          <Photo label="Photo" src={b.src} disabled={disabled} pick={pick} onChange={(src) => onChange({ ...b, src })} />
          <Url label="Link when tapped (optional)" value={b.href} disabled={disabled} onChange={(href) => onChange({ ...b, href })} />
        </>
      );
    case "twoImages":
      return (
        <div className="grid gap-[24px] md:grid-cols-2">
          {(["left", "right"] as const).map((side) => (
            <div key={side} className="flex flex-col gap-[12px]">
              <Photo label={side === "left" ? "Left photo" : "Right photo"} src={b[side].src} disabled={disabled} pick={pick} onChange={(src) => onChange({ ...b, [side]: { ...b[side], src } })} />
              <Bi label="Caption" value={b[side].caption} disabled={disabled} onChange={(caption) => onChange({ ...b, [side]: { ...b[side], caption } })} />
              <Url label="Link" value={b[side].href} disabled={disabled} onChange={(href) => onChange({ ...b, [side]: { ...b[side], href } })} />
            </div>
          ))}
        </div>
      );
    case "products":
      return (
        <>
          <Bi label="Small line above the pieces" value={b.title} disabled={disabled} onChange={(title) => onChange({ ...b, title })} />
          <span className={SMALL_LABEL}>Pieces — tick to include, in the order ticked</span>
          <ul className="m-0 grid list-none grid-cols-2 gap-[12px] p-0 md:grid-cols-4">
            {products.map((p) => {
              const on = b.ids.includes(p._id);
              return (
                <li key={p._id}>
                  <label className="flex cursor-pointer flex-col gap-[6px]">
                    <span className="relative flex aspect-[4/5] w-full items-center justify-center bg-[#f7f7f7]">
                      {p.image && <Image src={p.image} alt="" fill sizes="160px" className="object-contain p-[12px]" />}
                      {p.gif && <span className="absolute right-[6px] bottom-[6px] border-[0.5px] border-black bg-white px-[4px] py-[1px] font-gotham text-[11px]">GIF</span>}
                      {on && <span className="absolute top-[6px] left-[6px] bg-black px-[6px] py-[1px] font-gotham text-[11px] text-white">{b.ids.indexOf(p._id) + 1}</span>}
                    </span>
                    <span className="flex items-center gap-[6px] font-gotham text-[11px] leading-normal">
                      <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => onChange({ ...b, ids: e.target.checked ? [...b.ids, p._id] : b.ids.filter((x) => x !== p._id) })} className="accent-black" />
                      <span className="truncate">{p.name}</span>
                      <span className="text-black/50">{nok(p.priceOre)}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <label className="flex items-center gap-[8px] font-gotham text-paragraph text-black">
            <input type="checkbox" checked={b.useGifs} disabled={disabled} onChange={(e) => onChange({ ...b, useGifs: e.target.checked })} className="h-[14px] w-[14px] accent-black" /> Use the animated GIFs where a piece has one
          </label>
        </>
      );
    case "button":
      return (
        <>
          <Bi label="Label" value={b.label} disabled={disabled} onChange={(label) => onChange({ ...b, label })} />
          <Url label="Link (empty = the shop)" value={b.href} disabled={disabled} onChange={(href) => onChange({ ...b, href })} />
        </>
      );
    case "divider":
      return <p className="m-0 font-gotham text-[11px] text-black/50">A 32px hairline, centred. Nothing to set.</p>;
    case "spacer":
      return (
        <label className="flex flex-col gap-[6px] md:max-w-[200px]">
          <span className={SMALL_LABEL}>Height (px)</span>
          <input type="number" min={0} max={200} value={b.height} disabled={disabled} onChange={(e) => onChange({ ...b, height: Number(e.target.value) || 0 })} className={FIELD} />
        </label>
      );
  }
}

/** The media library in a sheet: tap a photo, or upload one. */
function ImagePicker({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [images, setImages] = useState<{ url: string; name: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    listImages().then(setImages).catch(() => setImages([]));
  }, []);
  const upload = async (file: File) => {
    const fd = new FormData();
    fd.set("file", file);
    const r = await uploadPickerImage(fd);
    if (r.ok) onPick(r.url);
    else setError(r.error);
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Choose a photo" className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-[12px] md:items-center md:p-[42px]" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[85vh] w-full max-w-[860px] flex-col gap-[12px] overflow-hidden bg-white p-[24px] font-gotham text-paragraph text-black">
        <div className="flex items-center justify-between gap-[12px]">
          <h2 className="m-0 font-gotham text-paragraph">Choose a photo</h2>
          <div className="flex items-center gap-[12px]">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <button type="button" onClick={() => fileRef.current?.click()} className={LINK}>Upload new</button>
            <button type="button" onClick={onClose} className={MUTED_LINK}>Close</button>
          </div>
        </div>
        <div className="h-px w-full bg-black/25" />
        {error && <p className="m-0 text-[#b00020]">{error}</p>}
        {images === null ? (
          <p className="m-0 text-black/50">Loading…</p>
        ) : images.length === 0 ? (
          <p className="m-0 text-black/50">No photos yet — upload one.</p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-3 gap-[12px] overflow-y-auto p-0 md:grid-cols-6">
            {images.map((img) => (
              <li key={img.url}>
                <button type="button" onClick={() => onPick(img.url)} className="relative block aspect-[4/5] w-full bg-[#f7f7f7] hover:opacity-80 transition-opacity" title={img.name}>
                  <Image src={img.url} alt={img.name} fill sizes="140px" className="object-contain p-[6px]" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
