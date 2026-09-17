import type { Metadata, Viewport } from "next";
import { Noto_Sans_HK } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_HK({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "步兵記憶庫",
  description: "送外賣時查地址、錄音記入口，下次更快搵到",
  applicationName: "步兵記憶庫",
  appleWebApp: {
    capable: true,
    title: "步兵記憶庫",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f3d2e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-HK" className={`${noto.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
