import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pastorale Flower - Order Tracker",
  description: "Order management system for Pastorale Flower shop",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
