import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Sounding · Your meetings, remembered", description: "An independent Fathom-inspired educational recreation. Explore synchronized recordings, searchable transcripts, summaries, and meeting decisions." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
