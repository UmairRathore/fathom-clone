import type { Metadata } from "next";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "Sounding · Your meetings, remembered",
  description:
    "An independent Fathom-inspired educational recreation. Explore synchronized recordings, searchable transcripts, summaries, and meeting decisions.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
