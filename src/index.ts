import { Color } from "./Color.js";

// ─── Scene registry ──────────────────────────────────────────────────────────

const SCENES = [
  {
    id: "cornellBoxMeshes",
    title: "Cornell Box (Mesh Scene)",
    tag: "Path Tracing",
    description:
      "Full path-traced Cornell box built from OBJ triangle meshes — two rotated boxes and the Utah teapot. Uses cosine-weighted hemisphere sampling and sphere-light next-event estimation.",
    thumb: null as string | null,
  },
  {
    id: "globalIllumination",
    title: "Global Illumination",
    tag: "Path Tracing",
    description:
      "Demonstrates indirect diffuse interreflection: a green sphere lit by a large emissive sphere light with colour bleeding onto the surrounding white walls.",
    thumb: null,
  },
  {
    id: "refraction",
    title: "Refraction",
    tag: "Dielectrics",
    description:
      "A glass sphere (IOR 1.5) refracts and inverts the scene behind it. Fresnel-weighted Russian roulette selects between specular reflection and transmission at each bounce.",
    thumb: null as string | null,
  },
  {
    id: "metalBunny",
    title: "Metal Bunny",
    tag: "Metallic BRDF",
    description:
      "Stanford Bunny rendered with a Disney-style Cook-Torrance GGX metallic BRDF. Gold F0 with roughness 0.25. BVH-accelerated intersection over 2000 triangles.",
    thumb: null as string | null,
  },
  {
    id: "backrooms",
    title: "The Backrooms",
    tag: "Environment",
    description:
      "A fluorescent-lit hallway fading to darkness — inspired by Kane Pixels' Backrooms. Yellowed walls, moist carpet, and recessed ceiling panels lit by warm area lights with progressive path-traced global illumination.",
    thumb: null as string | null,
  },
  {
    id: "chess",
    title: "Chess Board",
    tag: "Reflections",
    description:
      "Classic ray-tracing showcase: 32 pieces rendered as chrome, gold, silver, and glass spheres on an ivory-and-ebony checkerboard. Low dramatic camera angle with deep multi-bounce reflections between pieces.",
    thumb: null as string | null,
  },
];

// ─── Gallery view ─────────────────────────────────────────────────────────────

function renderGallery() {
  // Populate thumbnails from localStorage before building HTML.
  for (const s of SCENES) {
    const stored = localStorage.getItem('thumb_' + s.id);
    if (stored) s.thumb = stored;
  }

  const app = document.getElementById("app")!;
  app.innerHTML = `
    <div class="gallery">
      <div class="gallery-header">
        <h1>JS Raytracer</h1>
        <p>Monte Carlo path tracer — click a scene to render it in your browser</p>
      </div>
      <div class="scene-grid">
        ${SCENES.map(
          (s) => `
          <a class="scene-card" href="?scene=${s.id}">
            <div class="scene-thumb">
              ${s.thumb ? `<img src="${s.thumb}" alt="${s.title}" />` : "◈"}
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
  const tiles       = 4;
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

  function redraw() {
    redrawPending = false;
    const inv = 1 / 2.2;
    for (let pi = 0; pi < height; pi++) {
      for (let pj = 0; pj < width; pj++) {
        const idx = pi * width + pj;
        const n = sampleCounts[idx];
        if (n === 0) continue;
        const r = Math.min(1, Math.pow(Math.max(0, accumR[idx] / n), inv));
        const g = Math.min(1, Math.pow(Math.max(0, accumG[idx] / n), inv));
        const b = Math.min(1, Math.pow(Math.max(0, accumB[idx] / n), inv));
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
