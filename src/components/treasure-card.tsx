"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BUD_MARK } from "@/lib/bud-mark";
import { DEFAULT_VINTAGE_CARD, DEPTH_RANGE, type SheetBack, type VintageCardSetting } from "@/lib/vintage-card-shared";

/*
 * A real 3D card, drawn with three.js: the photo on the front under a lacquered clear coat, the brand
 * on the back, or (the "glass" variant) a clear glass block with the photo floating inside and the
 * mark etched in black on its back; paper-coloured edges with rounded corners, lit from the upper left with a soft cast
 * shadow on the floor and a studio environment reflected in its surfaces. The canvas is opaque and
 * painted in the page's colour (glass needs something to show through it), and the hero lays a fine,
 * moving film grain over everything so it reads as photographed rather than computed. Left
 * alone it turns slowly, forever, and bobs; grab it (mouse or finger) and it turns with you, keeps
 * a little momentum when let go, then the slow turn picks up again from there. On a device without WebGL, or for people
 * who prefer reduced motion, the plain photo is shown instead (still draggable without motion in the
 * latter case — the card simply doesn't move on its own).
 */
const CARD_W = 3;
const CARD_H = 4;
const CARD_D = 0.12;
/** The glass variant is a solid glass block with the photo floating inside it and the mark etched on its back. */
const BOX_D = 0.5;
/** Space between the photo inside the glass and the block's edges, the same on all four sides. */
const MARGIN = 0.35;
/** The glass block's corners: only just softened, unlike the card's. */
const GLASS_RADIUS = 0.03;
/**
 * How much the glass bends what's behind it. three.js shifts the picture seen through glass by this
 * much; tied to the real depth, a deep block seen at an angle shows the page beside it instead of
 * what's inside, so it is kept small whatever the depth.
 */
const GLASS_THICKNESS = 0.2;
/** Corner radius; RoundedBoxGeometry caps it at half the depth, so thin cards round less. */
const RADIUS = 0.14;

const SHEET_BACK: Record<SheetBack, number> = { paper: 0xf4f1ea, dark: 0x141414 };
/** The photo inside the glass is a real print, with a hair of thickness so its edge catches the light. */
const SHEET_D = 0.012;
/** The canvas hangs this much taller than its box, so the shadow on the floor isn't cut off below. */
const EXTEND = 1.5;

function brandBackTexture(color: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 1024;
  const g = c.getContext("2d")!;
  g.fillStyle = "#141414";
  g.fillRect(0, 0, c.width, c.height);
  // Just the bud mark (the Ö of the wordmark), centred.
  const scale = 200 / BUD_MARK.width;
  g.save();
  g.translate((c.width - BUD_MARK.width * scale) / 2, (c.height - BUD_MARK.height * scale) / 2);
  g.scale(scale, scale);
  g.fillStyle = color;
  for (const d of BUD_MARK.paths) g.fill(new Path2D(d));
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The bud mark drawn once: in its colour on transparent (the etched mark itself), or soft-edged on grey (its bump map). */
function markCanvas(mode: "mark" | "bump", color = "#0a0a0a"): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d")!;
  if (mode === "bump") {
    g.fillStyle = "#808080";
    g.fillRect(0, 0, c.width, c.height);
    g.filter = "blur(5px)";
  }
  const scale = 300 / BUD_MARK.height;
  g.translate((c.width - BUD_MARK.width * scale) / 2, (c.height - BUD_MARK.height * scale) / 2);
  g.scale(scale, scale);
  g.fillStyle = mode === "bump" ? "#303030" : color;
  for (const d of BUD_MARK.paths) g.fill(new Path2D(d));
  return c;
}
/** The mark as drawn on its plane: 300 of 512 texture pixels tall, on a plane MARK_PLANE wide. */
const MARK_PLANE = 1.1;
const MARK_H = (MARK_PLANE * 300) / 512;
const MARK_W = (MARK_H * BUD_MARK.width) / BUD_MARK.height;

function markTexture(color: string): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(markCanvas("mark", color));
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const markBumpTexture = () => new THREE.CanvasTexture(markCanvas("bump"));

/** Slow, soft noise used to ripple the glass surface very slightly, as cast glass does. */
function wobbleCanvas(): HTMLCanvasElement {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#808080";
  g.fillRect(0, 0, size, size);
  g.filter = "blur(28px)";
  for (let i = 0; i < 40; i++) {
    const v = 90 + Math.floor(Math.random() * 76);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.beginPath();
    g.arc(Math.random() * size, Math.random() * size, 20 + Math.random() * 40, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}
function wobbleTexture(): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(wobbleCanvas());
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * The bump map for the glass block's back face: the same faint wobble, plus the mark pressed into the
 * surface where the etched mark sits, so the glass itself shows the engraving. Drawn to the face's
 * own proportions (the back face maps 0–1 across CARD_W and CARD_H).
 */
function glassBackBumpTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#808080";
  g.fillRect(0, 0, size, size);
  g.globalAlpha = 0.3;
  g.drawImage(wobbleCanvas(), 0, 0, size, size);
  g.globalAlpha = 1;
  const w = (size * MARK_W) / CARD_W;
  const h = (size * MARK_H) / CARD_H;
  g.filter = "blur(2px)";
  g.translate((size - w) / 2, (size - h) / 2);
  g.scale(w / BUD_MARK.width, h / BUD_MARK.height);
  g.fillStyle = "#404040";
  for (const d of BUD_MARK.paths) g.fill(new Path2D(d));
  return new THREE.CanvasTexture(c);
}

/** Fine, even noise used as a roughness map: the sheen on the card breaks up like it does on real paper. */
function paperTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 150 + Math.round((Math.random() + Math.random() - 1) * 55);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 4);
  return t;
}

export default function TreasureCard({ src, alt, dark = false, setting = DEFAULT_VINTAGE_CARD, className = "" }: { src: string; alt: string; dark?: boolean; setting?: VintageCardSetting; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  // In development a panel under the card overrides the setting, to try values before saving them on the dashboard.
  const dev = process.env.NODE_ENV === "development";
  const [override, setOverride] = useState<Partial<VintageCardSetting>>({});
  const { variant, sheetBack, depth, markColor } = { ...setting, ...override };
  const glass = variant === "glass";
  // Depth and the print's back change live, without rebuilding the scene; the scene reads them through refs.
  const rebuild = useRef<((depth: number) => void) | null>(null);
  const depthNow = useRef(depth);
  const sheetBackMaterial = useRef<THREE.MeshStandardMaterial | null>(null);
  const sheetBackNow = useRef(sheetBack);
  const markMaterial = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const cardBackMaterial = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const markColorNow = useRef(markColor);

  useEffect(() => {
    depthNow.current = depth;
    rebuild.current?.(depth);
  }, [depth]);
  useEffect(() => {
    sheetBackNow.current = sheetBack;
    sheetBackMaterial.current?.color.set(SHEET_BACK[sheetBack]);
  }, [sheetBack]);
  useEffect(() => {
    markColorNow.current = markColor;
    const mark = markMaterial.current;
    if (mark) {
      mark.map?.dispose();
      mark.map = markTexture(markColor);
      mark.needsUpdate = true;
    }
    const cardBack = cardBackMaterial.current;
    if (cardBack) {
      cardBack.map?.dispose();
      cardBack.map = brandBackTexture(markColor);
      cardBack.needsUpdate = true;
    }
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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = dark ? 1.05 : 1.25;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // The clear isn't tone mapped, so the page colour comes out exactly as it went in.
    renderer.setClearColor(new THREE.Color(dark ? 0x141414 : 0xffffff), 1);
    renderer.domElement.style.touchAction = "pan-y";
    renderer.domElement.setAttribute("aria-label", alt);
    renderer.domElement.setAttribute("role", "img");
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // A longer lens than before: less perspective distortion, as in product photography.
    const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
    camera.position.set(0, 1.6, 13);
    camera.lookAt(0, -0.3, 0);

    // A studio room reflected in the card's surfaces; that is what gives the clear coat something to show.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    scene.environment = environment;

    // A warm key from the upper left, a cool fill from the right, and a little from everywhere.
    scene.add(new THREE.AmbientLight(0xffffff, dark ? 0.2 : 0.6));
    const key = new THREE.DirectionalLight(0xfff1e0, dark ? 2.0 : 1.5);
    key.position.set(-2.5, 12, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    key.shadow.camera.left = key.shadow.camera.bottom = -6;
    key.shadow.camera.right = key.shadow.camera.top = 6;
    key.shadow.radius = 24;
    key.shadow.blurSamples = 25;
    key.shadow.bias = -0.0005;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd8e4ff, 0.4);
    fill.position.set(5, 1, 4);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, dark ? 1.2 : 0.6);
    rim.position.set(0, 3, -6);
    scene.add(rim);

    // The card. Six materials: +x, -x, +y, -y, front (+z), back (-z).
    // The front is a print under a clear lacquer; the paper texture keeps its sheen from being glassy.
    const paper = paperTexture();
    const envMapIntensity = dark ? 0.9 : 0.55;
    const edge = new THREE.MeshStandardMaterial({ color: dark ? 0x303030 : 0xd8d3c8, roughness: dark ? 0.55 : 0.9, metalness: dark ? 0.25 : 0, envMapIntensity });
    const front = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.6, roughnessMap: paper, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.35, clearcoatRoughnessMap: paper, envMapIntensity });
    const back = new THREE.MeshPhysicalMaterial({ map: brandBackTexture(markColorNow.current), roughness: 0.7, roughnessMap: paper, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity });
    // The glass variant: a clear block (refraction and reflections from the environment) with the photo
    // floating flat, like a sheet of paper, in its middle and the mark etched in black on the inside of its back.
    // Real glass, subtly: it bends what's behind it (thickness, ior), splits light a little at the
    // edges (dispersion) and its surface isn't perfectly flat (a faint bump map), which shows as a slow wobble.
    const wobble = wobbleTexture();
    const glassMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0, thickness: GLASS_THICKNESS, ior: 1.5, dispersion: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, bumpMap: wobble, bumpScale: 0.006, attenuationColor: new THREE.Color(0xe4efea), attenuationDistance: 3, envMapIntensity });
    // The back face carries the engraving as a recess in the glass surface.
    const glassBackBump = glassBackBumpTexture();
    const glassBack = glassMaterial.clone();
    glassBack.bumpMap = glassBackBump;
    glassBack.bumpScale = 0.02;
    const inner = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, roughnessMap: paper, metalness: 0 });
    const innerBack = new THREE.MeshStandardMaterial({ color: SHEET_BACK[sheetBackNow.current], roughness: 0.9, metalness: 0 });
    sheetBackMaterial.current = innerBack;
    // The etched mark: lacquered black with a bevelled edge (its bump map), so it reads as cut into
    // the glass and catches the light. Opaque with a cut-out (alphaTest) rather than transparent,
    // so the glass's own render pass includes it.
    const markBump = markBumpTexture();
    const mark = new THREE.MeshPhysicalMaterial({ map: markTexture(markColorNow.current), alphaTest: 0.5, color: 0xffffff, roughness: 0.25, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, bumpMap: markBump, bumpScale: 0.01, envMapIntensity, side: THREE.DoubleSide });
    markMaterial.current = mark;
    cardBackMaterial.current = back;
    const card = new THREE.Group();
    const shell = new THREE.Mesh(new RoundedBoxGeometry(CARD_W, CARD_H, 1, 6, glass ? GLASS_RADIUS : RADIUS), glass ? [glassMaterial, glassMaterial, glassMaterial, glassMaterial, glassMaterial, glassBack] : [edge, edge, edge, edge, front, back]);
    shell.castShadow = true;
    shell.receiveShadow = false;
    card.add(shell);
    const photoW = CARD_W - MARGIN * 2;
    const photoH = CARD_H - MARGIN * 2;
    // The print: photo on the front, plain back, and paper edges as thick as a real print.
    const sheet = glass ? new THREE.BoxGeometry(photoW, photoH, SHEET_D) : null;
    const photo = sheet ? new THREE.Mesh(sheet, [innerBack, innerBack, innerBack, innerBack, inner, innerBack]) : null;
    const etched = glass ? new THREE.Mesh(new THREE.PlaneGeometry(MARK_PLANE, MARK_PLANE), mark) : null;
    if (photo) card.add(photo);
    if (etched) card.add(etched);
    scene.add(card);
    const build = (d: number) => {
      shell.geometry.dispose();
      shell.geometry = new RoundedBoxGeometry(CARD_W, CARD_H, d, 6, glass ? GLASS_RADIUS : RADIUS);
      if (etched) etched.position.z = -d / 2 + 0.01;
    };
    build(depthNow.current);
    rebuild.current = build;

    // The photo, fitted to cover the front once it has loaded (the card is drawn white meanwhile).
    // Fetched through our own image route, so the texture is same-origin and WebGL may read it.
    const loader = new THREE.TextureLoader();
    loader.load(
      `/_next/image?url=${encodeURIComponent(src)}&w=1080&q=75`,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        const img = texture.image as { width: number; height: number };
        const cardAspect = photo ? photoW / photoH : CARD_W / CARD_H;
        const photoAspect = img.width / img.height;
        if (photoAspect > cardAspect) {
          texture.repeat.set(cardAspect / photoAspect, 1);
          texture.offset.set((1 - cardAspect / photoAspect) / 2, 0);
        } else {
          texture.repeat.set(1, photoAspect / cardAspect);
          texture.offset.set(0, (1 - photoAspect / cardAspect) / 2);
        }
        const shown = photo ? inner : front;
        shown.map = texture;
        shown.needsUpdate = true;
      },
      undefined,
      () => {
        /* no photo: the card stays plain white */
      },
    );

    // The floor, invisible except where the card's shadow falls on it.
    const floorY = -CARD_H / 2 - 0.5;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: dark ? 0.5 : 0.16 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY;
    floor.receiveShadow = true;
    scene.add(floor);


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
      targetPitch = THREE.MathUtils.clamp(targetPitch + (e.clientY - lastY) * 0.006, -0.6, 0.6);
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
      // Frame the card in the box's own height; the extra canvas below just shows more floor.
      const boxHeight = height / EXTEND;
      camera.aspect = width / boxHeight;
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const wanted = (CARD_H * 1.25) / (2 * Math.tan(vFov / 2));
      const byWidth = (CARD_W * 1.6) / (2 * Math.tan(vFov / 2) * camera.aspect);
      camera.position.z = Math.max(wanted, byWidth);
      camera.setViewOffset(width, boxHeight, 0, 0, width, height);
      camera.updateProjectionMatrix();
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
      rebuild.current = null;
      shell.geometry.dispose();
      sheet?.dispose();
      etched?.geometry.dispose();
      sheetBackMaterial.current = null;
      markMaterial.current = null;
      cardBackMaterial.current = null;
      wobble.dispose();
      glassBackBump.dispose();
      markBump.dispose();
      for (const m of [edge, front, back, glassMaterial, glassBack, inner, innerBack, mark]) {
        m.map?.dispose();
        m.dispose();
      }
      paper.dispose();
      environment.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
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
