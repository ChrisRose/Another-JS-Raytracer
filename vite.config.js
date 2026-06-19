// vite.config.js
import basicSsl from "@vitejs/plugin-basic-ssl";

export default {
  // Base path for GitHub Pages — matches the repository name.
  base: "/Another-JS-Raytracer/",
  plugins: [basicSsl()],
  // Workers use dynamic imports for scene loading; ES module format is required.
  worker: {
    format: "es",
  },
};
