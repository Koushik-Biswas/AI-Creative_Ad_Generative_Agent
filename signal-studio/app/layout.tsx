import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal Studio | B2B Creative Intelligence",
  description:
    "Turn business knowledge and competitor evidence into distinctive B2B ad creatives.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
