"use client";

import { useDropzone } from "palette-forge/react";
import { useToast } from "./Toast";

export function Dropzone({
  onFile,
  busy,
}: {
  onFile: (file: File) => void;
  busy: boolean;
}) {
  const toast = useToast();
  const { rootProps, inputProps, isOver } = useDropzone({
    onFile,
    onReject: (reason) => toast(reason, "bad"),
  });

  return (
    <div
      {...rootProps}
      aria-label="Drop an image, paste from the clipboard, or click to browse"
      aria-busy={busy}
      className={[
        "cursor-pointer rounded-[10px] border border-dashed px-6 py-11 text-center transition-colors duration-200",
        isOver
          ? "border-solid border-accent bg-surface-2"
          : "border-line bg-surface hover:border-accent hover:bg-surface-2",
      ].join(" ")}
    >
      <input {...inputProps} />
      <div className="text-[15px] font-medium">
        {busy ? "Reading pixels…" : "Drop an image, paste from clipboard, or click to browse"}
      </div>
      <div className="mt-1.5 font-mono text-[13px] text-muted">
        PNG · JPG · WEBP · SVG, processed entirely in your browser
      </div>
    </div>
  );
}
