import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BUD_MARK } from "@/lib/bud-mark";
import type { SheetBack, VintageCardSetting } from "@/lib/vintage-card-shared";

/*
 * The treasure card's three.js scene, on its own so two things can draw it: the live card on the
 * vintage product page (treasure-card.tsx, which adds the pointer and the motion) and the Instagram
 * export (instagram-video.ts, which renders it frame by frame into a video).
 *
 * A real 3D card: the photo on the front under a lacquered clear coat, the brand on the back, or
 * (the "glass" variant) a clear glass block with the photo floating inside and the mark etched on
 * its back; paper-coloured edges with rounded corners, lit from the upper left with a soft cast
 * shadow on the floor and a studio environment reflected in its surfaces. The canvas is opaque and
 * painted in the page's colour (glass needs something to show through it).
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

const SHEET_BACK: Record<SheetBack, number> = {
  paper: 0xf4f1ea,
  dark: 0x141414,
};
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
  g.translate(
    (c.width - BUD_MARK.width * scale) / 2,
    (c.height - BUD_MARK.height * scale) / 2,
  );
  g.scale(scale, scale);
  g.fillStyle = color;
  for (const d of BUD_MARK.paths) g.fill(new Path2D(d));
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The bud mark drawn once: in its colour on transparent (the etched mark itself), or soft-edged on grey (its bump map). */
function markCanvas(
  mode: "mark" | "bump",
  color = "#0a0a0a",
): HTMLCanvasElement {
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
  g.translate(
    (c.width - BUD_MARK.width * scale) / 2,
    (c.height - BUD_MARK.height * scale) / 2,
  );
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
    g.arc(
      Math.random() * size,
      Math.random() * size,
      20 + Math.random() * 40,
      0,
      Math.PI * 2,
    );
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

export type TreasureScene = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** The card (or glass block) itself: rotate and move this. */
  card: THREE.Group;
  setDepth(depth: number): void;
  setSheetBack(back: SheetBack): void;
  setMarkColor(color: string): void;
  /**
   * Frames the card inside a box boxHeight px tall, boxTop px from the top of a width × height canvas;
   * the rest shows floor. `room` is the box's height in card heights: 1.25 fits a card that only
   * turns; a card that is tilted by hand needs more, or its top leaves the box.
   */
  frame(width: number, height: number, boxTop: number, boxHeight: number, room?: number): void;
  /** Resolves once the photo is on the card (or has failed to load, leaving it white). */
  ready: Promise<void>;
  dispose(): void;
};

/** The renderer settings the scene is lit for. The clear isn't tone mapped, so the page colour comes out exactly as it went in. */
export function configureTreasureRenderer(
  renderer: THREE.WebGLRenderer,
  dark: boolean,
) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = dark ? 1.05 : 1.25;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(new THREE.Color(dark ? 0x141414 : 0xffffff), 1);
}

export const TREASURE_BACKGROUND = (dark: boolean) =>
  dark ? "#141414" : "#ffffff";

export function createTreasureScene(
  renderer: THREE.WebGLRenderer,
  {
    src,
    dark,
    setting,
  }: { src: string; dark: boolean; setting: VintageCardSetting },
): TreasureScene {
  const { variant, sheetBack, markColor, depth } = setting;
  const glass = variant === "glass";
  const scene = new THREE.Scene();
  // A longer lens than before: less perspective distortion, as in product photography.
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
  camera.position.set(0, 1.6, 13);
  camera.lookAt(0, -0.1, 0);

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
  const edge = new THREE.MeshStandardMaterial({
    color: dark ? 0x303030 : 0xd8d3c8,
    roughness: dark ? 0.55 : 0.9,
    metalness: dark ? 0.25 : 0,
    envMapIntensity,
  });
  const front = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.6,
    roughnessMap: paper,
    metalness: 0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.35,
    clearcoatRoughnessMap: paper,
    envMapIntensity,
  });
  const back = new THREE.MeshPhysicalMaterial({
    map: brandBackTexture(markColor),
    roughness: 0.7,
    roughnessMap: paper,
    metalness: 0.05,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4,
    envMapIntensity,
  });
  // The glass variant: a clear block (refraction and reflections from the environment) with the photo
  // floating flat, like a sheet of paper, in its middle and the mark etched in black on the inside of its back.
  // Real glass, subtly: it bends what's behind it (thickness, ior), splits light a little at the
  // edges (dispersion) and its surface isn't perfectly flat (a faint bump map), which shows as a slow wobble.
  const wobble = wobbleTexture();
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 1,
    roughness: 0,
    thickness: GLASS_THICKNESS,
    ior: 1.5,
    dispersion: 0.12,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    bumpMap: wobble,
    bumpScale: 0.006,
    attenuationColor: new THREE.Color(0xe4efea),
    attenuationDistance: 3,
    envMapIntensity,
  });
  // The back face carries the engraving as a recess in the glass surface.
  const glassBackBump = glassBackBumpTexture();
  const glassBack = glassMaterial.clone();
  glassBack.bumpMap = glassBackBump;
  glassBack.bumpScale = 0.02;
  const inner = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.8,
    roughnessMap: paper,
    metalness: 0,
  });
  const innerBack = new THREE.MeshStandardMaterial({
    color: SHEET_BACK[sheetBack],
    roughness: 0.9,
    metalness: 0,
  });
  // The etched mark: lacquered black with a bevelled edge (its bump map), so it reads as cut into
  // the glass and catches the light. Opaque with a cut-out (alphaTest) rather than transparent,
  // so the glass's own render pass includes it.
  const markBump = markBumpTexture();
  const mark = new THREE.MeshPhysicalMaterial({
    map: markTexture(markColor),
    alphaTest: 0.5,
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    bumpMap: markBump,
    bumpScale: 0.01,
    envMapIntensity,
    side: THREE.DoubleSide,
  });
  const card = new THREE.Group();
  const shell = new THREE.Mesh(
    new RoundedBoxGeometry(CARD_W, CARD_H, 1, 6, glass ? GLASS_RADIUS : RADIUS),
    glass
      ? [
          glassMaterial,
          glassMaterial,
          glassMaterial,
          glassMaterial,
          glassMaterial,
          glassBack,
        ]
      : [edge, edge, edge, edge, front, back],
  );
  shell.castShadow = true;
  shell.receiveShadow = false;
  card.add(shell);
  const photoW = CARD_W - MARGIN * 2;
  const photoH = CARD_H - MARGIN * 2;
  // The print: photo on the front, plain back, and paper edges as thick as a real print.
  const sheet = glass ? new THREE.BoxGeometry(photoW, photoH, SHEET_D) : null;
  const photo = sheet
    ? new THREE.Mesh(sheet, [
        innerBack,
        innerBack,
        innerBack,
        innerBack,
        inner,
        innerBack,
      ])
    : null;
  const etched = glass
    ? new THREE.Mesh(new THREE.PlaneGeometry(MARK_PLANE, MARK_PLANE), mark)
    : null;
  if (photo) card.add(photo);
  if (etched) card.add(etched);
  scene.add(card);
  const build = (d: number) => {
    shell.geometry.dispose();
    shell.geometry = new RoundedBoxGeometry(
      CARD_W,
      CARD_H,
      d,
      6,
      glass ? GLASS_RADIUS : RADIUS,
    );
    if (etched) etched.position.z = -d / 2 + 0.01;
  };
  build(depth);

  // The photo, fitted to cover the front once it has loaded (the card is drawn white meanwhile).
  // Fetched through our own image route, so the texture is same-origin and WebGL may read it.
  const loader = new THREE.TextureLoader();
  const ready = new Promise<void>((resolve) => {
    loader.load(
      `/_next/image?url=${encodeURIComponent(src)}&w=1080&q=75`,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(
          8,
          renderer.capabilities.getMaxAnisotropy(),
        );
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
        resolve();
      },
      undefined,
      () => {
        /* no photo: the card stays plain white */
        resolve();
      },
    );
  });

  // The floor, invisible except where the card's shadow falls on it.
  const floorY = -CARD_H / 2 - 0.5;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: dark ? 0.5 : 0.16 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = floorY;
  floor.receiveShadow = true;
  scene.add(floor);

  const frame = (
    width: number,
    height: number,
    boxTop: number,
    boxHeight: number,
  ) => {
    camera.aspect = width / boxHeight;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const wanted = (CARD_H * 1.25) / (2 * Math.tan(vFov / 2));
    const byWidth = (CARD_W * 1.6) / (2 * Math.tan(vFov / 2) * camera.aspect);
    camera.position.z = Math.max(wanted, byWidth);
    camera.setViewOffset(width, boxHeight, 0, -boxTop, width, height);
    camera.updateProjectionMatrix();
  };

  return {
    scene,
    camera,
    card,
    ready,
    frame,
    setDepth: build,
    setSheetBack: (b) => innerBack.color.set(SHEET_BACK[b]),
    setMarkColor: (c) => {
      mark.map?.dispose();
      mark.map = markTexture(c);
      mark.needsUpdate = true;
      back.map?.dispose();
      back.map = brandBackTexture(c);
      back.needsUpdate = true;
    },
    dispose: () => {
      shell.geometry.dispose();
      sheet?.dispose();
      etched?.geometry.dispose();
      wobble.dispose();
      glassBackBump.dispose();
      markBump.dispose();
      for (const m of [
        edge,
        front,
        back,
        glassMaterial,
        glassBack,
        inner,
        innerBack,
        mark,
      ]) {
        m.map?.dispose();
        m.dispose();
      }
      paper.dispose();
      environment.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
    },
  };
}

export { CARD_D, BOX_D, EXTEND };
