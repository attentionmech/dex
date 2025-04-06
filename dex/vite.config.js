import { defineConfig } from "vite";
import viteCompression from "vite-plugin-compression";

export default defineConfig({
    base: "./",
    build: {
        outDir: "dist",
    },
    plugins: [
        viteCompression({
            algorithm: 'gzip',
            ext: '.gz',
            deleteOriginFile: false,
            filter: /\.(arrow|jsonl|js|css|html)$/i, // compress these
        }),
    ],
});

