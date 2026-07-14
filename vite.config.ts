import { defineConfig } from "vite";

export default defineConfig({
	base: "./",
	build: {
		target: "es2022",
		assetsInlineLimit: 100000
	},
	server: {
		port: 5199
	},
	// Vitest: the gym fairness proofs are exhaustive searches and can run
	// for tens of seconds each.
	test: {
		testTimeout: 120000
	}
} as never);
