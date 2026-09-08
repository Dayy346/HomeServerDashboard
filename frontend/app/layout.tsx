import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Home Server Dashboard",
  description: "CasaOS replacement dashboard for system, Pi-hole, and downloads",
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
