import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DropOS — The OS for your dropshipping business",
    template: "%s | DropOS",
  },
  description:
    "DropOS gives dropshippers crystal-clear profit tracking, landed cost calculation, and multi-store analytics in one place.",
  keywords: ["dropshipping", "profit tracking", "analytics", "ecommerce", "shopify"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
