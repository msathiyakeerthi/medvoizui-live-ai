import {defineConfig} from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
declare const global: Window;

// https://vitejs.dev/config/
export default defineConfig({
	define: {
		global: typeof global === "undefined" && Window,
	},
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});

/* import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',  // Change output directory from 'dist' to 'build'
    commonjsOptions: {
      include: [/node_modules/],
    },
    rollupOptions: {
      external: [],
    },
  },
});
*/
