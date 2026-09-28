import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz"] });

export const metadata: Metadata = {
  title: { default: "RQdinn Client OS", template: "%s · RQdinn Client OS" },
  description: "RQDINN — Build. Manage. Deliver. The operating system for every RQdinn client.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#F7F3EA",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "!rounded-xl !border !border-line !bg-white !text-ink !shadow-lift !font-sans",
              description: "!text-muted",
              success: "[&_[data-icon]]:!text-green",
              error: "[&_[data-icon]]:!text-danger",
            },
          }}
        />
      </body>
    </html>
  );
}
