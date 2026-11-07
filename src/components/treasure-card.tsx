"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/*
 * A real 3D card, drawn with three.js: the photo on the front, the brand on the back, paper-coloured
 * edges with rounded corners, lit from the upper left with a soft cast shadow on the floor. Left
 * alone it turns slowly, forever, and bobs; grab it (mouse or finger) and it turns with you, keeps
 * a little momentum when let go, then the slow turn picks up again from there. On a device without WebGL, or for people
 * who prefer reduced motion, the plain photo is shown instead (still draggable without motion in the
 * latter case — the card simply doesn't move on its own).
 */
const CARD_W = 3;
const CARD_H = 4;
const CARD_D = 0.12;
const RADIUS = 0.14;
/** The canvas hangs this much taller than its box, so the shadow on the floor isn't cut off below. */
const EXTEND = 1.5;

function brandBackTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 1024;
  const g = c.getContext("2d")!;
  g.fillStyle = "#141414";
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "rgba(255,255,255,0.18)";
  g.lineWidth = 2;
  const inset = 40;
  const r = 28;
  g.beginPath();
  g.roundRect(inset, inset, c.width - inset * 2, c.height - inset * 2, r);
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.font = "48px Americana, 'Times New Roman', serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  const word = "F L Ö R A";
  g.fillText(word, c.width / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default function TreasureCard({ src, alt, dark = false, className = "" }: { src: string; alt: string; dark?: boolean; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
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
    renderer.domElement.style.touchAction = "pan-y";
    renderer.domElement.setAttribute("aria-label", alt);
    renderer.domElement.setAttribute("role", "img");
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(0, 1.6, 11.5);
    camera.lookAt(0, -0.3, 0);

    // Light from the upper left, a cool fill from the right, and a little from everywhere.
    scene.add(new THREE.AmbientLight(0xffffff, dark ? 0.55 : 1.3));
    const key = new THREE.DirectionalLight(0xffffff, dark ? 2.2 : 1.6);
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
    const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5);
    fill.position.set(5, 1, 4);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, dark ? 1.2 : 0.6);
    rim.position.set(0, 3, -6);
    scene.add(rim);

    // The card. Six materials: +x, -x, +y, -y, front (+z), back (-z).
    const edge = new THREE.MeshStandardMaterial({ color: dark ? 0x2a2a2a : 0xd8d3c8, roughness: 0.85, metalness: 0 });
    const front = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0 });
    const back = new THREE.MeshStandardMaterial({ map: brandBackTexture(), roughness: 0.7, metalness: 0.05 });
    const geometry = new RoundedBoxGeometry(CARD_W, CARD_H, CARD_D, 6, RADIUS);
    const card = new THREE.Mesh(geometry, [edge, edge, edge, edge, front, back]);
    card.castShadow = true;
    card.receiveShadow = false;
    scene.add(card);

    // The photo, fitted to cover the front once it has loaded (the card is drawn white meanwhile).
    // Fetched through our own image route, so the texture is same-origin and WebGL may read it.
    const loader = new THREE.TextureLoader();
    loader.load(
      `/_next/image?url=${encodeURIComponent(src)}&w=1080&q=75`,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        const img = texture.image as { width: number; height: number };
        const cardAspect = CARD_W / CARD_H;
        const photoAspect = img.width / img.height;
        if (photoAspect > cardAspect) {
          texture.repeat.set(cardAspect / photoAspect, 1);
          texture.offset.set((1 - cardAspect / photoAspect) / 2, 0);
        } else {
          texture.repeat.set(1, photoAspect / cardAspect);
          texture.offset.set(0, (1 - photoAspect / cardAspect) / 2);
        }
        front.map = texture;
        front.needsUpdate = true;
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
      geometry.dispose();
      for (const m of [edge, front, back]) {
        m.map?.dispose();
        m.dispose();
      }
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [src, alt, dark]);

  if (fallback) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={`absolute inset-0 h-full w-full object-contain ${className}`} />;
  }
  // Absolutely placed and taller than its box: see EXTEND.
  return <div ref={host} className={`absolute inset-x-0 top-0 ${className}`} style={{ height: `${EXTEND * 100}%` }} />;
}
