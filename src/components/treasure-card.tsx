"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { BOX_D, CARD_D, EXTEND, configureTreasureRenderer, createTreasureScene } from "./treasure-scene";
import { DEFAULT_VINTAGE_CARD, DEPTH_RANGE, type VintageCardSetting } from "@/lib/vintage-card-shared";

/*
 * The treasure card on the page (the scene itself is in treasure-scene.ts). Left alone it turns
 * slowly, forever, and bobs; grab it (mouse or finger) and it turns with you, keeps a little
 * momentum when let go, then the slow turn picks up again from there. On a device without WebGL,
 * or for people who prefer reduced motion, the plain photo is shown instead (still draggable
 * without motion in the latter case — the card simply doesn't move on its own).
 */
export default function TreasureCard({ src, alt, dark = false, setting = DEFAULT_VINTAGE_CARD, className = "" }: { src: string; alt: string; dark?: boolean; setting?: VintageCardSetting; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  // In development a panel under the card overrides the setting, to try values before saving them on the dashboard.
  const dev = process.env.NODE_ENV === "development";
  const [override, setOverride] = useState<Partial<VintageCardSetting>>({});
  const current: VintageCardSetting = { ...setting, ...override };
  const { variant, sheetBack, depth, markColor } = current;
  const glass = variant === "glass";
  // Depth, the print's back and the mark's colour change live, without rebuilding the scene; the
  // scene is built from whatever these refs hold and then follows them.
  const live = useRef<ReturnType<typeof createTreasureScene> | null>(null);
  const settingNow = useRef(current);

  useEffect(() => {
    settingNow.current.depth = depth;
    live.current?.setDepth(depth);
  }, [depth]);
  useEffect(() => {
    settingNow.current.sheetBack = sheetBack;
    live.current?.setSheetBack(sheetBack);
  }, [sheetBack]);
  useEffect(() => {
    settingNow.current.markColor = markColor;
    live.current?.setMarkColor(markColor);
  }, [markColor]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "low-power" });
    } catch {
      // No WebGL here: hand over to the plain photo once this effect has run.
      const id = requestAnimationFrame(() => setFallback(true));
      return () => cancelAnimationFrame(id);
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    configureTreasureRenderer(renderer, dark);
    renderer.domElement.style.touchAction = "pan-y";
    renderer.domElement.setAttribute("aria-label", alt);
    renderer.domElement.setAttribute("role", "img");
    el.appendChild(renderer.domElement);

    const built = createTreasureScene(renderer, { src, dark, setting: { ...settingNow.current, variant: glass ? "glass" : "card" } });
    live.current = built;
    const { scene, camera, card } = built;

    // Motion: a slow, endless turn and a gentle bob when idle; the pointer takes over while
    // dragging, and after a drag the turn resumes from wherever the card was left.
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let velY = 0;
    let velX = 0;
    let yaw = 0;
    let pitch = 0.08;
    // While dragging, the pointer sets a target and the card eases after it, so a hand that stops
    // dead doesn't stop the card dead; the momentum on release is read from the eased motion.
    let targetYaw = 0;
    let targetPitch = 0.08;
    let idleSince = 0;
    let bobPhase = 0;
    const TURN = 0.35; // radians per second: one full turn in about 18 seconds

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      targetYaw = yaw;
      targetPitch = pitch;
      velY = velX = 0;
      renderer.domElement.setPointerCapture(e.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      targetYaw += (e.clientX - lastX) * 0.012;
      targetPitch = THREE.MathUtils.clamp(targetPitch + (e.clientY - lastY) * 0.006, -0.5, 0.5);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      idleSince = performance.now();
      renderer.domElement.releasePointerCapture(e.pointerId);
      renderer.domElement.style.cursor = "grab";
    };
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    const resize = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      // Frame the card in the box's own height, with room above for a hand-tilted card; the extra
      // canvas below just shows more floor.
      built.frame(width, height, 0, height / EXTEND, 1.4);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let frame = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      if (dragging) {
        // Ease after the pointer; remember the speed so letting go carries on from it.
        const k = Math.min(1, dt * 9);
        const dyaw = (targetYaw - yaw) * k;
        const dpitch = (targetPitch - pitch) * k;
        yaw += dyaw;
        pitch += dpitch;
        velY = dyaw / dt;
        velX = dpitch / dt;
      } else {
        // Momentum from the drag fades out while the slow turn fades back in, so there is no jolt.
        yaw += velY * dt;
        pitch += velX * dt;
        velY *= Math.pow(0.08, dt);
        velX *= Math.pow(0.08, dt);
        const resume = Math.min(1, Math.max(0, (now - idleSince - 300) / 1200));
        if (!reduced) {
          yaw += TURN * resume * dt;
          bobPhase += dt;
          pitch += (0.08 - pitch) * Math.min(1, dt * 1.5);
        }
      }
      card.rotation.set(pitch, yaw, 0);
      card.position.y = reduced ? 0 : Math.sin(bobPhase * 1.0) * 0.12;
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      live.current = null;
      built.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [src, alt, dark, glass]);

  if (fallback) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={`absolute inset-0 h-full w-full object-contain ${className}`} />;
  }
  // Absolutely placed and taller than its box: see EXTEND.
  return (
    <>
      <div ref={host} className={`absolute inset-x-0 top-0 ${className}`} style={{ height: `${EXTEND * 100}%` }} />
      {dev && (
        <div className="fixed right-[16px] bottom-[16px] z-50 flex items-center gap-[14px] rounded-full bg-black/80 px-[14px] py-[8px] font-mono text-[12px] text-white shadow-lg">
          {(["card", "glass"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setOverride((o) => ({ ...o, variant: v, depth: v === setting.variant ? setting.depth : v === "glass" ? BOX_D : CARD_D }))} className={`rounded-full px-[10px] py-[2px] ${v === variant ? "bg-white text-black" : "text-white/70 hover:text-white"}`}>
              {v}
            </button>
          ))}
          {glass && (
            <span className="flex items-center gap-[6px]">
              back
              {(["paper", "dark"] as const).map((b) => (
                <button key={b} type="button" onClick={() => setOverride((o) => ({ ...o, sheetBack: b }))} className={`rounded-full px-[8px] py-[2px] ${b === sheetBack ? "bg-white text-black" : "text-white/70 hover:text-white"}`}>
                  {b}
                </button>
              ))}
            </span>
          )}
          <label className="flex items-center gap-[8px]">
            depth
            <input type="range" min={DEPTH_RANGE.min} max={DEPTH_RANGE.max} step={0.01} value={depth} onChange={(e) => setOverride((o) => ({ ...o, depth: Number(e.target.value) }))} className="w-[140px]" />
            <span className="w-[36px] tabular-nums">{depth.toFixed(2)}</span>
          </label>
        </div>
      )}
    </>
  );
}
