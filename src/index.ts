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
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setPixel(
  imageData: ImageData,
  i: number,
  j: number,
  color: { r: number; g: number; b: number },
  width: number
) {
  const index = i * width * 4 + j * 4;
  imageData.data[index + 0] = color.r * 255;
  imageData.data[index + 1] = color.g * 255;
  imageData.data[index + 2] = color.b * 255;
  imageData.data[index + 3] = 0xff;
}

// ─── Gallery view ─────────────────────────────────────────────────────────────

function renderGallery() {
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
        <a class="back-link" href="/">← All scenes</a>
        <h1>${sceneTitle}</h1>
        <span class="render-status" id="render-status">Starting…</span>
      </div>
      <div class="canvas-wrap">
        <div class="canvas-placeholder" id="placeholder">
          <div class="spinner"></div>
          <p>Rendering with 16 workers…</p>
        </div>
      </div>
    </div>
  `;

  startRender(sceneId);
}

function startRender(sceneName: string) {
  const width  = 400;
  const height = 400;
  const tiles  = 4;           // tiles × tiles = number of workers

  const canvas = document.getElementById("render-canvas") as HTMLCanvasElement;
  const ctx    = canvas.getContext("2d")!;
  canvas.width  = width;
  canvas.height = height;
  const imageData = ctx.createImageData(width, height);

  const total  = tiles * tiles;
  let finished = 0;

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

  for (let i = 0; i < tiles; i++) {
    const iStart = (i * width)  / tiles;
    const iEnd   = ((i + 1) * width)  / tiles;

    for (let j = 0; j < tiles; j++) {
      const jStart = (j * height) / tiles;
      const jEnd   = ((j + 1) * height) / tiles;

      const worker = new Worker(
        new URL("./tracePaths.ts", import.meta.url),
        { type: "module" }
      );

      worker.postMessage({ iStart, iEnd, jStart, jEnd, width, imageMaps: {}, sceneName });

      worker.onmessage = (e: MessageEvent) => {
        const { pixelColors } = e.data as {
          pixelColors: { i: number; j: number; pixelColor: { r: number; g: number; b: number } }[];
        };

        for (const { i: pi, j: pj, pixelColor } of pixelColors) {
          setPixel(imageData, pi, pj, pixelColor, width);
        }

        finished++;
        const pct = Math.round((finished / total) * 100);
        updateStatus(finished < total ? `Rendering… ${pct}%` : "Done ✓");

        // Show canvas as soon as the first tile arrives
        if (finished === 1) swapInCanvas();
        ctx.putImageData(imageData, 0, 0);

        worker.terminate();
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
