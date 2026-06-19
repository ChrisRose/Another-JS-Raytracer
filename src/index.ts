import { Color } from "./Color.js";

// ─── Scene registry ──────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL;

const SCENES = [
  {
    id: "cornellBoxMeshes",
    title: "Cornell Box (Mesh Scene)",
    tag: "Path Tracing",
    description:
      "Classic Cornell box with a red left wall, green right wall, and a diffuse ceiling area light. Two white OBJ boxes of different heights share the floor with a red Utah teapot. Cosine-weighted hemisphere sampling with sphere-light next-event estimation.",
    thumb: `${BASE}thumbnails/cornellBoxMeshes.jpg` as string | null,
  },
  {
    id: "globalIllumination",
    title: "Global Illumination",
    tag: "Path Tracing",
    description:
      "A green diffuse sphere in a white room lit by an emissive sphere off to the left. Green light bleeds onto the surrounding white walls — a minimal scene that isolates indirect colour interreflection.",
    thumb: `${BASE}thumbnails/globalIllumination.jpg` as string | null,
  },
  {
    id: "refraction",
    title: "Refraction",
    tag: "Dielectrics",
    description:
      "A large glass sphere (IOR 1.5) sits in a room with a red left wall, blue right wall, and gold ceiling. An orange and a teal sphere behind the glass appear inverted and distorted through refraction. Fresnel-weighted Russian roulette picks between reflection and transmission at each bounce.",
    thumb: `${BASE}thumbnails/refraction.jpg` as string | null,
  },
  {
    id: "metalBunny",
    title: "Metal Bunny",
    tag: "Metallic BRDF",
    description:
      "Stanford Bunny rendered with a Cook-Torrance GGX metallic BRDF — gold F0 (1.0, 0.71, 0.29) at roughness 0.25. Red and green side walls reflect across the polished gold surface. BVH-accelerated intersection over ~70 000 triangles.",
    thumb: `${BASE}thumbnails/metalBunny.jpg` as string | null,
  },
  {
    id: "backrooms",
    title: "The Backrooms",
    tag: "Environment",
    description:
      "A 63-unit deep corridor with yellow chevron-patterned walls, dark brown carpet, and ten warm fluorescent ceiling panels fading to darkness. A nearly black teapot silhouette stands mid-hallway beside a side door on the left. Progressive path-traced global illumination.",
    thumb: `${BASE}thumbnails/backrooms.jpg` as string | null,
  },
  {
    id: "dragon",
    title: "Stanford Dragon",
    tag: "Subsurface Scattering",
    description:
      "Stanford Dragon (100k triangles) in translucent jade. A waxy GGX gloss coat sits over a subsurface scattering body — 45% of body bounces pass through thin sections and exit the far side tinted green, making fins and claws glow when backlit.",
    thumb: `${BASE}thumbnails/dragon.jpg` as string | null,
  },
  {
    id: "chess",
    title: "Chess Board",
    tag: "Reflections",
    description:
      "A Qe1# checkmate position: polished silver and dark gunmetal pieces on a semi-reflective lacquered board — piece silhouettes and the Milky Way sky reflect faintly in the ivory-and-ebony squares via a Fresnel-weighted GGX gloss layer.",
    thumb: `${BASE}thumbnails/chess.jpg` as string | null,
  },
  {
    id: "lab",
    title: "Laboratory",
    tag: "Volumetrics",
    description:
      "A lab bench with eight glass test tubes of coloured luminous liquids, procedural wood-grain surface, and atmospheric dust that scatters a warm shaft of sunlight through the window — Henyey-Greenstein phase function, Beer's law shadow transmittance.",
    thumb: `${BASE}thumbnails/lab.jpg` as string | null,
  },
];

// ─── Gallery view ─────────────────────────────────────────────────────────────

function renderGallery() {
  // Prefer user-rendered localStorage thumbnail over the static one.
  for (const s of SCENES) {
    const stored = localStorage.getItem('thumb_' + s.id);
    if (stored) s.thumb = stored;
  }

  const app = document.getElementById("app")!;
  // Clone the inline prism SVG from the <template> element
  const prismTemplate = document.getElementById("prism-svg") as HTMLTemplateElement | null;
  const prismHTML = prismTemplate ? prismTemplate.innerHTML.trim() : "";

  app.innerHTML = `
    <div class="gallery">
      <div class="gallery-header">
        ${prismHTML}
        <div class="gallery-header-text">
          <h1>JS Raytracer</h1>
          <p>Monte Carlo path tracer — click a scene to render it in your browser</p>
        </div>
      </div>
      <div class="scene-grid">
        ${SCENES.map(
          (s) => `
          <a class="scene-card" href="?scene=${s.id}">
            <div class="scene-thumb">
              ${s.thumb ? `<img src="${s.thumb}" alt="${s.title}" onerror="this.replaceWith(document.createTextNode('◈'))" />` : "◈"}
            </div>
            <div class="scene-info">
              <span class="scene-tag">${s.tag}</span>
              <h2>${s.title}</h2>
              <p>${s.description}</p>
              <span class="render-link">Render →</span>
            </div>
          </a>`
        ).join("")}
      </div>
    </div>
  `;
}

// ─── Renderer view ────────────────────────────────────────────────────────────

function renderScene(sceneId: string, sceneTitle: string) {
  const app = document.getElementById("app")!;
  app.innerHTML = `
    <div class="renderer-page">
      <div class="renderer-nav">
        <a class="back-link" href="${window.location.pathname}">← All scenes</a>
        <h1>${sceneTitle}</h1>
        <span class="render-status" id="render-status">Starting…</span>
      </div>
      <div class="canvas-wrap">
        <div class="canvas-placeholder" id="placeholder">
          <div class="spinner"></div>
          <p>Starting render…</p>
        </div>
      </div>
    </div>
  `;

  startRender(sceneId);
}

async function loadImageData(url: string): Promise<ImageData | null> {
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload  = () => resolve();
      img.onerror = () => reject(new Error("image load failed"));
      img.src = url;
    });
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width  = img.naturalWidth;
    tmpCanvas.height = img.naturalHeight;
    tmpCanvas.getContext("2d")!.drawImage(img, 0, 0);
    return tmpCanvas.getContext("2d")!.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
  } catch {
    return null;
  }
}

async function startRender(sceneName: string) {
  // Preload scene-specific sky images before spawning workers.
  const imageMaps: Record<string, ImageData> = {};
  if (sceneName === "chess") {
    const skyUrl = new URL("./assets/milkyway.jpg", import.meta.url).href;
    const skyData = await loadImageData(skyUrl);
    if (skyData) imageMaps["sky"] = skyData;
  }

  const width       = 600;
  const height      = 600;
  // Heavy-mesh scenes (dragon, metalBunny) parse large OBJs in every worker.
  // Use fewer tiles on memory-constrained devices to avoid tab crashes.
  const heavyMesh = sceneName === "dragon" || sceneName === "metalBunny";
  const mobile    = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const tiles       = heavyMesh && mobile ? 1 : heavyMesh ? 2 : 4;
  const totalPasses = 192;

  const canvas = document.getElementById("render-canvas") as HTMLCanvasElement;
  const ctx    = canvas.getContext("2d")!;
  canvas.width  = width;
  canvas.height = height;

  // Raw linear-light accumulation buffers — gamma is applied at draw time.
  const accumR     = new Float32Array(width * height);
  const accumG     = new Float32Array(width * height);
  const accumB     = new Float32Array(width * height);
  const sampleCounts = new Uint32Array(width * height);
  const imageData  = ctx.createImageData(width, height);

  let swapped        = false;
  let redrawPending  = false;
  let msgsReceived   = 0;
  let thumbSaved     = false;
  const totalMsgs    = tiles * tiles * totalPasses;

  const updateStatus = (text: string) => {
    const el = document.getElementById("render-status");
    if (el) el.textContent = text;
  };

  function swapInCanvas() {
    const placeholder = document.getElementById("placeholder");
    if (placeholder) {
      placeholder.replaceWith(canvas);
      canvas.style.display = "block";
    }
  }

  const aces = (x: number) => {
    x = Math.max(0, x);
    return Math.min(1, (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14));
  };


  function redraw() {
    redrawPending = false;
    const inv = 1 / 2.2;
    for (let pi = 0; pi < height; pi++) {
      for (let pj = 0; pj < width; pj++) {
        const idx = pi * width + pj;
        const n = sampleCounts[idx];
        if (n === 0) continue;
        const r = Math.pow(aces(accumR[idx] / n), inv);
        const g = Math.pow(aces(accumG[idx] / n), inv);
        const b = Math.pow(aces(accumB[idx] / n), inv);
        const p = idx * 4;
        imageData.data[p]     = r * 255;
        imageData.data[p + 1] = g * 255;
        imageData.data[p + 2] = b * 255;
        imageData.data[p + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  for (let ti = 0; ti < tiles; ti++) {
    const iStart = (ti * height) / tiles;
    const iEnd   = ((ti + 1) * height) / tiles;

    for (let tj = 0; tj < tiles; tj++) {
      const jStart = (tj * width) / tiles;
      const jEnd   = ((tj + 1) * width) / tiles;

      const worker = new Worker(
        new URL("./tracePaths.ts", import.meta.url),
        { type: "module" }
      );

      worker.postMessage({ iStart, iEnd, jStart, jEnd, width, imageMaps, sceneName, totalPasses });

      worker.onmessage = (e: MessageEvent) => {
        const { pass, pixelColors } = e.data as {
          pass: number;
          totalPasses: number;
          pixelColors: { i: number; j: number; r: number; g: number; b: number }[];
        };

        for (const { i: pi, j: pj, r, g, b } of pixelColors) {
          const idx = pi * width + pj;
          accumR[idx] += r;
          accumG[idx] += g;
          accumB[idx] += b;
          sampleCounts[idx]++;
        }

        msgsReceived++;
        const spp = Math.round(msgsReceived / (tiles * tiles));
        const done = msgsReceived >= totalMsgs;
        updateStatus(done ? `Done — ${totalPasses} spp` : `Rendering… ${spp} spp`);

        if (!swapped) { swapInCanvas(); swapped = true; }

        if (!redrawPending) {
          redrawPending = true;
          requestAnimationFrame(redraw);
        }

        // Auto-save thumbnail once at 32 accumulated spp.
        if (!thumbSaved && msgsReceived === 32 * tiles * tiles) {
          thumbSaved = true;
          requestAnimationFrame(() => {
            try {
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              localStorage.setItem('thumb_' + sceneName, dataUrl);
            } catch {
              // Silently ignore quota or security errors.
            }
          });
        }

        if (pass === totalPasses - 1) worker.terminate();
      };

      worker.onerror = (err) => {
        console.error("Worker error:", err);
        updateStatus("Error — see console");
        worker.terminate();
      };
    }
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

const params  = new URLSearchParams(window.location.search);
const sceneId = params.get("scene");
const scene   = SCENES.find((s) => s.id === sceneId);

if (scene) {
  renderScene(scene.id, scene.title);
} else {
  renderGallery();
}
