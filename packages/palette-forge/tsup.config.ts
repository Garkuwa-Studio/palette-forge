import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "react/index": "src/react/index.ts",
    "node/index": "src/node/index.ts",
    cli: "src/cli.ts",
  },
  format: ["esm"],
  target: "es2022",
  platform: "neutral",
  splitting: true,
  treeshake: true,
  clean: false,
  // Declarations come from `tsc -p tsconfig.build.json` in the build script,
  // which keeps .d.ts output independent of the bundler's TypeScript plugin.
  dts: false,
  external: ["react", "sharp", "jpeg-js", "pngjs"],
});
