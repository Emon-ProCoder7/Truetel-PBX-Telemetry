import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrueTel — PBX Telemetry",
  description: "Live call activity and rep performance for the TrueTel sales team.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
