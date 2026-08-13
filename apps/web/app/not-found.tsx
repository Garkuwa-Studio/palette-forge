import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-[1080px] flex-col justify-center">
      <p className="eyebrow text-accent">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.025em]">
        That palette doesn&rsquo;t parse.
      </h1>
      <p className="mt-3 max-w-[54ch] text-sm text-muted">
        Palette links look like{" "}
        <code className="font-mono text-txt">/p/4cc9f0-f0554c-0f121a</code>, up to twelve hex
        codes joined by dashes. Something in that URL isn&rsquo;t a colour.
      </p>
      <p className="mt-6">
        <Link href="/" className="eyebrow text-accent hover:underline">
          Forge a new one →
        </Link>
      </p>
    </main>
  );
}
