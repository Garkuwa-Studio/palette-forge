/**
 * The handful of primitives the app repeats. Deliberately small. This is a
 * one-page tool, not a design system, and abstracting further would cost more
 * than it saves.
 */

export function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="eyebrow mb-4 flex items-baseline gap-2 border-b border-line pb-2.5 text-muted">
        {title}
        {hint && <span className="text-faint normal-case tracking-normal">{hint}</span>}
      </h2>
      {children}
    </section>
  );
}

export function Button({
  children,
  active,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={[
        "eyebrow cursor-pointer rounded-[5px] border px-3.5 py-2 transition-colors",
        active
          ? "border-accent text-accent"
          : "border-line bg-surface-2 text-txt hover:border-accent hover:text-accent",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-txt",
        props.className ?? "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** WCAG pass/fail chip. */
export function Pill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-[3px] px-1.5 py-px font-mono text-[10px] tracking-wide ${
        ok ? "bg-ok/12 text-ok" : "bg-bad/12 text-bad"
      }`}
    >
      {children}
    </span>
  );
}

/** Small square colour chip used in the contrast table. */
export function Dot({ hex }: { hex: string }) {
  return (
    <span
      aria-hidden
      className="mr-1.5 inline-block size-2.5 -translate-y-px rounded-[2px] border border-chip-ring align-middle"
      style={{ background: hex }}
    />
  );
}
