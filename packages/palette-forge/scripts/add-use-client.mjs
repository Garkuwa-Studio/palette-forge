/**
 * Re-add the "use client" directive to the React entry after bundling.
 *
 * esbuild strips module-level directives when it bundles, because in general a
 * directive from one input file should not silently apply to a merged output.
 * For this entry it must: without it, a React Server Component importing
 * `palette-forge/react` fails at build time with "you're importing a component
 * that needs useState". Only the entry needs marking, everything it pulls in
 * joins the client graph automatically.
 */

import { readFile, writeFile } from "node:fs/promises";

const TARGETS = ["dist/react/index.js"];
const DIRECTIVE = '"use client";';

for (const target of TARGETS) {
  const source = await readFile(target, "utf8");
  if (source.startsWith(DIRECTIVE) || source.startsWith("'use client';")) continue;
  await writeFile(target, `${DIRECTIVE}\n${source}`, "utf8");
  console.log(`  added "use client" to ${target}`);
}
