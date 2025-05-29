import { defineConfig } from "vite";

export default defineConfig({
    base: "./",
    server: {
        port: 3001,
    },
    build: {
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    kaplay: ["kaplay"],
                },
            },
        },
    },
});