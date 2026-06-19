# Just Another JS/Canvas-based ~~Ray~~Path Tracer

### A personal experiment in tracing rays. Current progress:

![cornell box with teapot](https://github.com/ChrisRose/Another-JS-Raytracer/blob/path-tracer/renders/collage.png?raw=true)

nvm use 18.13.0

npm run dev -- --host

## Rendering & thumbnails

### Run the dev server

```bash
npm run dev -- --host
```

### Generate thumbnails

Thumbnails are pre-rendered Node.js images stored in `public/thumbnails/` and
served by the deployed site.  The script uses `tsx` (no separate build step).

```bash
# Render all scenes (takes several minutes)
npx tsx generate-thumbnails.mts

# Render a single scene by ID
npx tsx generate-thumbnails.mts lab
npx tsx generate-thumbnails.mts dragon
```

Available scene IDs: `cornellBoxMeshes`, `globalIllumination`, `refraction`,
`metalBunny`, `backrooms`, `chess`, `dragon`, `lab`.

Output is written to `public/thumbnails/<id>.jpg` at 600×600, 96 passes.
Commit the updated `.jpg` and push to `main` — the GitHub Actions deploy
workflow picks it up automatically.

### First-time setup (native canvas dependency)

The thumbnail script requires the `canvas` package which needs system libs:

```bash
# Ubuntu / Debian
sudo apt-get install libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev

npm install
npm rebuild canvas
```
