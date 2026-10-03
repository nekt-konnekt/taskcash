import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "TaskCash", description: "Complete verified tasks, earn cash, and unlock useful digital content." };

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en-NG"><body>{children}</body></html>; }