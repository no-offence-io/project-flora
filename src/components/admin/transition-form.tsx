"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Muted, Subheading } from "@/components/admin/ui";
import type { LoadingStyle } from "@/lib/loading-shared";
import type { BlinkAxis, TransitionDirection, TransitionSetting, TransitionType } from "@/lib/page-transition-shared";

const TYPES: { value: TransitionType; label: string; hint: string }[] = [
  { value: "fade", label: "Fade", hint: "One page fades into the next." },
  { value: "push", label: "Push", hint: "The new page pushes the old one off the screen." },
  { value: "blink", label: "Blink", hint: "The page closes like an eye and opens on the new one." },
  { value: "blur", label: "Blur", hint: "Blurs away to white, then the new page sharpens in." },
  { value: "none", label: "None", hint: "No transition. The new page just appears." },
];
const DIRECTIONS: { value: TransitionDirection; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "up", label: "Up" },
  { value: "down", label: "Down" },
];
const AXES: { value: BlinkAxis; label: string }[] = [
  { value: "vertical", label: "Top and bottom" },
  { value: "horizontal", label: "Left and right" },
];

const LOOKS: { value: LoadingStyle; label: string; hint: string }[] = [
  { value: "a", label: "A · Soft light", hint: "A light passing over the tile" },
  { value: "b", label: "B · Breathing Ö", hint: "The Flöra mark, breathing" },
  { value: "c", label: "C · Drawn frame", hint: "A thin line drawn around the tile" },
];

const EASE = "cubic-bezier(0.76, 0, 0.24, 1)";
const MOVE: Record<TransitionDirection, { enter: string; leave: string }> = {
  left: { enter: "translateX(100%)", leave: "translateX(-100%)" },
  right: { enter: "translateX(-100%)", leave: "translateX(100%)" },
  up: { enter: "translateY(100%)", leave: "translateY(-100%)" },
  down: { enter: "translateY(-100%)", leave: "translateY(100%)" },
};
const OPEN = "inset(0 0 0 0)";
const SHUT: Record<BlinkAxis, string> = { vertical: "inset(50% 0 50% 0)", horizontal: "inset(0 50% 0 50%)" };

/** Keeps a choice as a row of buttons the same size as the form's other fields. */
function Choice<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <fieldset className="m-0 flex flex-col gap-[6px] border-0 p-0">
      <legend className="mb-[6px] font-gotham text-[11px] leading-normal text-black">{label}</legend>
      <div className="flex flex-wrap gap-[12px]">
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-[8px] border border-black/20 px-[12px] py-[10px] font-gotham text-paragraph text-black has-[:checked]:border-black">
            <input type="radio" checked={value === o.value} onChange={() => onChange(o.value)} className="h-[14px] w-[14px] accent-black" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function TransitionForm({ initial, initialLoading, action }: { initial: TransitionSetting; initialLoading: LoadingStyle; action: (formData: FormData) => void | Promise<void> }) {
  const [s, setS] = useState(initial);
  const [look, setLook] = useState(initialLoading);
  const set = (patch: Partial<TransitionSetting>) => setS((prev) => ({ ...prev, ...patch }));
  const stage = useRef<HTMLDivElement>(null);
  const from = useRef<HTMLDivElement>(null);
  const to = useRef<HTMLDivElement>(null);
  const middle = useRef<HTMLDivElement>(null);

  /** The chosen transition on a small stage, with the same timings as the shop. */
  const play = useCallback(() => {
    const [box, a, b, m] = [stage.current, from.current, to.current, middle.current];
    if (!box || !a || !b || !m) return;
    [a, b, m].forEach((el) => el.getAnimations().forEach((x) => x.cancel()));
    const run = (el: HTMLElement, frames: Keyframe[], duration: number, delay = 0, easing = EASE) => el.animate(frames, { duration, delay, easing, fill: "both" });
    box.style.backgroundColor = s.type === "blink" ? "#000000" : "#ffffff";
    m.style.visibility = s.type === "push" && s.middle ? "visible" : "hidden";
    const { enter, leave } = MOVE[s.direction];
    if (s.type === "none") {
      run(a, [{ opacity: 1 }, { opacity: 0 }], 1, 500);
      run(b, [{ opacity: 0 }, { opacity: 1 }], 1, 500);
    } else if (s.type === "fade") {
      run(a, [{ opacity: 1 }, { opacity: 0 }], 280, 0, "ease-in");
      run(b, [{ opacity: 0 }, { opacity: 1 }], 450, 280, "ease-out");
    } else if (s.type === "push" && s.middle) {
      run(a, [{ transform: "none" }, { transform: leave }], 520);
      run(m, [{ transform: enter, offset: 0 }, { transform: "none", offset: 0.4 }, { transform: "none", offset: 0.6 }, { transform: leave, offset: 1 }], 1300);
      run(b, [{ transform: enter }, { transform: "none" }], 520, 780);
    } else if (s.type === "push") {
      run(a, [{ transform: "none" }, { transform: leave }], 520);
      run(b, [{ transform: enter }, { transform: "none" }], 520);
    } else if (s.type === "blink") {
      run(a, [{ clipPath: OPEN }, { clipPath: SHUT[s.axis] }], 320, 0, "cubic-bezier(0.55, 0, 1, 0.45)");
      run(b, [{ clipPath: SHUT[s.axis] }, { clipPath: OPEN }], 420, 400, "cubic-bezier(0, 0.55, 0.45, 1)");
    } else {
      run(a, [{ filter: "blur(0)", opacity: 1 }, { filter: "blur(14px)", opacity: 0 }], 420, 0, "ease-in");
      run(b, [{ filter: "blur(14px)", opacity: 0 }, { filter: "blur(0)", opacity: 1 }], 520, 380, "ease-out");
    }
  }, [s]);

  useEffect(() => {
    play();
  }, [play]);

  return (
    <form action={action} className="flex max-w-[860px] flex-col gap-[42px]">
      <input type="hidden" name="type" value={s.type} />
      <input type="hidden" name="direction" value={s.direction} />
      <input type="hidden" name="axis" value={s.axis} />
      {s.middle && <input type="hidden" name="middle" value="on" />}
      <input type="hidden" name="loadingStyle" value={look} />

      <Card>
        <Subheading>Transition</Subheading>
        <div className="h-px w-full bg-black/25" />
        <div className="flex flex-col gap-[12px]">
          {TYPES.map((t) => (
            <label key={t.value} className="flex cursor-pointer items-center gap-[12px] border border-black/20 p-[12px] font-gotham text-paragraph text-black has-[:checked]:border-black">
              <input type="radio" checked={s.type === t.value} onChange={() => set({ type: t.value })} className="h-[14px] w-[14px] shrink-0 accent-black" />
              <span className="flex flex-col gap-[2px]">
                <span>{t.label}</span>
                <span className="text-[11px] leading-normal text-black/50">{t.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {s.type === "push" && (
          <>
            <Choice label="Direction the pages move" options={DIRECTIONS} value={s.direction} onChange={(direction) => set({ direction })} />
            <label className="flex items-center gap-[8px] font-gotham text-paragraph text-black">
              <input type="checkbox" checked={s.middle} onChange={(e) => set({ middle: e.target.checked })} className="h-[14px] w-[14px] accent-black" />
              Add middle screen
            </label>
            <Muted className="text-[11px]">A black screen with the logo passes through between the two pages.</Muted>
          </>
        )}
        {s.type === "blink" && <Choice label="Closes from" options={AXES} value={s.axis} onChange={(axis) => set({ axis })} />}
      </Card>

      <Card>
        <Subheading>Preview</Subheading>
        <div className="h-px w-full bg-black/25" />
        <div ref={stage} className="admin-true-colors relative aspect-[16/10] w-full max-w-[520px] overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
          <div ref={from} className="absolute inset-0 flex items-center justify-center font-americana text-[24px]" style={{ backgroundColor: "#ececec", color: "#000000" }}>This page</div>
          <div ref={to} className="absolute inset-0 flex items-center justify-center font-americana text-[24px]" style={{ backgroundColor: "#c9c4b8", color: "#000000" }}>Next page</div>
          <div ref={middle} className="absolute inset-0 flex items-center justify-center font-americana text-[24px]" style={{ backgroundColor: "#000000", color: "#ffffff", visibility: "hidden" }}>FLÖRA</div>
        </div>
        <button type="button" onClick={play} className="w-max border border-black px-[18px] py-[10px] font-gotham text-paragraph text-black hover:bg-black hover:text-white transition-colors">Play again</button>
      </Card>

      <Card>
        <Subheading>While photos load</Subheading>
        <div className="h-px w-full bg-black/25" />
        <div className="grid grid-cols-3 gap-[12px] md:gap-[24px]">
          {LOOKS.map((l) => (
            <label key={l.value} className="flex min-w-0 cursor-pointer flex-col gap-[6px] font-gotham text-paragraph text-black">
              <span data-loader={l.value} className="loader-tile relative block aspect-[4/5] border border-transparent bg-[#f7f7f7] has-[+_span_input:checked]:border-black" />
              <span className="flex items-center gap-[8px]">
                <input type="radio" checked={look === l.value} onChange={() => setLook(l.value)} className="h-[14px] w-[14px] shrink-0 accent-black" />
                {l.label}
              </span>
              <span className="text-[11px] leading-normal text-black/50">{l.hint}</span>
            </label>
          ))}
        </div>
      </Card>

      <Button className="md:max-w-[320px]">Save</Button>
    </form>
  );
}
