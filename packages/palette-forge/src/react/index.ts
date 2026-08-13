"use client";

/**
 * React bindings for Palette Forge.
 *
 * Headless by design, hooks and state, no markup and no styles, so the palette
 * UI can look like whatever your product looks like.
 *
 * @example
 * ```tsx
 * import { usePalette, useDropzone } from "palette-forge/react";
 *
 * function Forge() {
 *   const { palette, load, preview, status } = usePalette({ colors: 6 });
 *   const { rootProps, inputProps, isOver } = useDropzone({ onFile: load });
 *
 *   return (
 *     <div {...rootProps} data-over={isOver}>
 *       <input {...inputProps} />
 *       {status === "loading" && <Spinner />}
 *       {palette?.swatches.map((s) => (
 *         <span key={s.hex} style={{ background: s.hex, color: s.on }}>{s.hex}</span>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @module
 */

export { usePalette, type UsePaletteResult, type PaletteStatus } from "./usePalette.js";
export {
  useDropzone,
  type UseDropzoneOptions,
  type UseDropzoneResult,
} from "./useDropzone.js";
