"use client";

/**
 * Drag-drop, click-to-browse, and paste-from-clipboard, as spreadable props.
 *
 * Kept headless: it returns prop objects and state, never markup, so it drops
 * into any design system. The paste listener is global by design, people expect
 * ⌘V to work anywhere on the page, not only when a specific div has focus.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";

export interface UseDropzoneOptions {
  /** Called with the accepted file. */
  onFile: (file: File) => void;
  /** MIME prefix to accept. Default `"image/"`. */
  accept?: string;
  /** Listen for paste on `window`. Default `true`. */
  paste?: boolean;
  /** Reject files larger than this many bytes. Default 25MB. */
  maxBytes?: number;
  /** Called when a file is rejected, with the reason. */
  onReject?: (reason: string, file?: File) => void;
  disabled?: boolean;
}

export interface UseDropzoneResult {
  /** True while a drag is over the zone, use it to style the drop target. */
  isOver: boolean;
  /** Spread onto the drop target element. */
  rootProps: HTMLAttributes<HTMLElement> & { tabIndex: number; role: string };
  /** Spread onto a visually hidden `<input type="file">`. */
  inputProps: InputHTMLAttributes<HTMLInputElement> & { ref: React.Ref<HTMLInputElement> };
  /** Open the file browser programmatically. */
  open: () => void;
}

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;

export function useDropzone(options: UseDropzoneOptions): UseDropzoneResult {
  const {
    onFile,
    accept = "image/",
    paste = true,
    maxBytes = DEFAULT_MAX_BYTES,
    onReject,
    disabled = false,
  } = options;

  const [isOver, setIsOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Nested elements fire dragleave as the pointer crosses them; counting
  // enter/leave pairs is what keeps the highlight from flickering.
  const dragDepth = useRef(0);

  const handlers = useRef({ onFile, onReject, accept, maxBytes, disabled });
  handlers.current = { onFile, onReject, accept, maxBytes, disabled };

  const accepts = useCallback((file: File): boolean => {
    const current = handlers.current;
    if (!file.type.startsWith(current.accept)) {
      current.onReject?.(`${file.name || "That file"} is not an image`, file);
      return false;
    }
    if (file.size > current.maxBytes) {
      const mb = (current.maxBytes / 1024 / 1024).toFixed(0);
      current.onReject?.(`Image is larger than ${mb}MB`, file);
      return false;
    }
    return true;
  }, []);

  const accept1 = useCallback(
    (file: File | null | undefined) => {
      if (!file || handlers.current.disabled) return;
      if (accepts(file)) handlers.current.onFile(file);
    },
    [accepts],
  );

  const open = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const onDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current++;
    setIsOver(true);
  }, []);

  const onDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    // Without this the browser navigates to the dropped file.
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsOver(false);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      dragDepth.current = 0;
      setIsOver(false);
      accept1(event.dataTransfer?.files?.[0]);
    },
    [accept1],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    },
    [open],
  );

  useEffect(() => {
    if (!paste || disabled) return;

    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith(handlers.current.accept)) {
          accept1(item.getAsFile());
          return;
        }
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [paste, disabled, accept1]);

  return {
    isOver,
    open,
    rootProps: {
      onClick: open,
      onKeyDown,
      onDragEnter,
      onDragOver,
      onDragLeave,
      onDrop,
      tabIndex: disabled ? -1 : 0,
      role: "button",
      "aria-disabled": disabled || undefined,
    },
    inputProps: {
      ref: inputRef,
      type: "file",
      accept: `${accept}*`,
      hidden: true,
      disabled,
      onChange: (event) => {
        accept1(event.target.files?.[0]);
        // Reset so re-selecting the same file fires change again.
        event.target.value = "";
      },
    },
  };
}
