import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Qaskly",
    template: "%s - Qaskly",
  },
  description: "Presentaciones interactivas en tiempo real.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es" className={`${inter.variable} ${jakarta.variable}`}>
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla adds
          `cz-shortcut-listen`) mutate <body> before React hydrates. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
