"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface DocsNavItem {
  id: string;
  label: string;
}

/**
 * Sticky vertical docs navigation with a sliding active indicator.
 *
 * Active section is tracked by scroll position rather than IntersectionObserver
 * ratios. Headings are zero-height anchors, so ratio-based observation is
 * unreliable for them, asking "which heading is the last one above the reading
 * line" is both simpler and matches what a reader considers the current section.
 */
export function DocsNav({ items }: { items: DocsNavItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null);

  const listRef = useRef<HTMLUListElement>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());

  /* ------------------------------------------------ track the active section */

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      // The line down the viewport that counts as "what you're reading".
      const readingLine = window.scrollY + window.innerHeight * 0.25;

      let current = items[0]?.id ?? "";
      for (const item of items) {
        const element = document.getElementById(item.id);
        if (!element) continue;
        if (element.getBoundingClientRect().top + window.scrollY <= readingLine) {
          current = item.id;
        }
      }

      // At the very bottom the last section may be too short to ever cross the
      // reading line, select it explicitly so the nav can always reach its end.
      const atBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 2;
      if (atBottom) current = items.at(-1)?.id ?? current;

      setActive(current);
    };

    const onScroll = () => {
      // Scroll fires far more often than paint; coalesce to one measure a frame.
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  /* ------------------------------------------------- position the indicator */

  const positionIndicator = useCallback(() => {
    const link = linkRefs.current.get(active);
    const list = listRef.current;
    if (!link || !list) return;
    setIndicator({ top: link.offsetTop, height: link.offsetHeight });
  }, [active]);

  useEffect(() => {
    positionIndicator();
  }, [positionIndicator]);

  useEffect(() => {
    // Fonts landing after first paint shift every link; re-measure once ready.
    if (!document.fonts?.ready) return;
    void document.fonts.ready.then(positionIndicator);
  }, [positionIndicator]);

  useEffect(() => {
    window.addEventListener("resize", positionIndicator);
    return () => window.removeEventListener("resize", positionIndicator);
  }, [positionIndicator]);

  /* Keep the active item visible in the horizontal mobile strip. */
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    linkRefs.current.get(active)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [active]);

  return (
    <nav
      aria-label="On this page"
      className="
        sticky top-0 z-20 -mx-6 mb-6 border-b border-line bg-bg/85 px-6 py-3 backdrop-blur
        lg:top-8 lg:z-0 lg:mx-0 lg:mb-0 lg:self-start lg:border-b-0 lg:bg-transparent
        lg:px-0 lg:py-0 lg:backdrop-blur-none
      "
    >
      <p className="eyebrow mb-3 hidden text-faint lg:block">On this page</p>

      <ul
        ref={listRef}
        className="
          scroll-x relative flex gap-1 lg:flex-col lg:gap-0 lg:overflow-visible
          lg:border-l lg:border-line
        "
      >
        {/* The sliding rail. Hidden on mobile, where the strip scrolls instead. */}
        <li
          aria-hidden
          className="absolute left-0 hidden w-px bg-accent transition-[top,height] duration-300 ease-[var(--ease-out-expo)] lg:block"
          style={{
            top: indicator?.top ?? 0,
            height: indicator?.height ?? 0,
            // Nothing to point at until the first measurement lands.
            opacity: indicator ? 1 : 0,
          }}
        />

        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id} className="shrink-0">
              <a
                href={`#${item.id}`}
                ref={(node) => {
                  if (node) linkRefs.current.set(item.id, node);
                  else linkRefs.current.delete(item.id);
                }}
                aria-current={isActive ? "location" : undefined}
                className={`
                  block whitespace-nowrap rounded-md px-3 py-1.5 font-mono text-[11px]
                  transition-colors duration-200
                  lg:rounded-none lg:px-4 lg:py-2
                  ${
                    isActive
                      ? "bg-surface-2 text-accent lg:bg-transparent"
                      : "text-muted hover:bg-surface-2 hover:text-txt lg:hover:bg-transparent"
                  }
                `}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
