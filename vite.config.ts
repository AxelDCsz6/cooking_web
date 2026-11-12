import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "web",
  plugins: [react()],
  build: { outDir: "../dist", emptyOutDir: true },
  server: {
    proxy: {
      "/recipe_names": "http://localhost:3000",
      "/create_recipe": "http://localhost:3000",
      "/static": "http://localhost:3000",
    },
  },
});
