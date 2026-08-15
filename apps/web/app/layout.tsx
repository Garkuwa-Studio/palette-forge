import type { Metadata, Viewport } from "next";
import { NO_FLASH_SCRIPT } from "@/components/ThemeToggle";
import "./globals.css";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://palette-forge-web.vercel.app/";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Palette Forge, extract a brand palette, generate the tokens",
    template: "%s · Palette Forge",
  },
  description:
    "Drop in a logo or screenshot. Palette Forge finds the main colours, works out which is your brand colour and which your text colour, checks they can be read together, and writes the CSS for you, plain CSS, Tailwind, shadcn/ui or DTCG. Runs entirely in your browser.",
  keywords: [
    "color palette generator",
    "design tokens",
    "brand colors",
    "WCAG contrast checker",
    "tailwind theme generator",
    "shadcn theme",
    "oklch",
    "color extraction",
  ],
  authors: [{ name: "Palette Forge" }],
  openGraph: {
    type: "website",
    siteName: "Palette Forge",
    title: "Give it a picture. Get the colours, and the code to use them.",
    description:
      "Drop in a logo or screenshot. Palette Forge finds the main colours, checks they're readable together, and writes the CSS for you. Free, and nothing is uploaded.",
    url: SITE,
  },
  twitter: {
    card: "summary_large_image",
    title: "Extract a brand palette. Generate the tokens.",
    description:
      "Drop an image, get accessible design tokens. OKLab k-means, WCAG scoring, CSS/Tailwind/shadcn/DTCG output.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#08090c" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the no-flash script mutates `data-theme` on this
    // element before React hydrates, so server and client markup differ here by
    // design.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="px-6 pt-8 pb-24">{children}</body>
    </html>
  );
}
