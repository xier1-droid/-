import type { Metadata } from "next";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "摊主日记账",
  description: "给小摊商家的手机记账与经营看板",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/shop-ledger-mark.svg", apple: "/shop-ledger-mark.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><PwaRegister />{children}</body></html>;
}
