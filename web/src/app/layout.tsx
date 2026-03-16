import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import ClientWrapper from "@/components/ClientWrapper";
import DownloadAppButton from "@/components/DownloadAppButton";
import dynamic from 'next/dynamic';

const CapacitorWrapper = dynamic(() => import('@/components/CapacitorWrapper'), { ssr: false });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b0f1a" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1a" },
  ],
};

export const metadata: Metadata = {
  title: "Laporan WA Generator",
  description: "Aplikasi pembuat laporan WhatsApp untuk Direktorat Kesiapsiagaan Basarnas",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "https://pub-03210bb1ce9c4a419bd417ee47bd4e6d.r2.dev/logo-lap-wa.png", sizes: "32x32", type: "image/png" },
      { url: "https://pub-03210bb1ce9c4a419bd417ee47bd4e6d.r2.dev/logo-lap-wa.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "https://pub-03210bb1ce9c4a419bd417ee47bd4e6d.r2.dev/logo-lap-wa.png",
    apple: [
      { url: "https://pub-03210bb1ce9c4a419bd417ee47bd4e6d.r2.dev/logo-lap-wa.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "apple-touch-icon", url: "https://pub-03210bb1ce9c4a419bd417ee47bd4e6d.r2.dev/logo-lap-wa.png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Laporan WA",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Favicon */}
        <link rel="icon" href="https://pub-03210bb1ce9c4a419bd417ee47bd4e6d.r2.dev/logo-lap-wa.png" type="image/png" />
        <link rel="shortcut icon" href="https://pub-03210bb1ce9c4a419bd417ee47bd4e6d.r2.dev/logo-lap-wa.png" type="image/png" />
        <link rel="apple-touch-icon" href="https://pub-03210bb1ce9c4a419bd417ee47bd4e6d.r2.dev/logo-lap-wa.png" />
        <link rel="apple-touch-icon-precomposed" href="https://pub-03210bb1ce9c4a419bd417ee47bd4e6d.r2.dev/logo-lap-wa.png" />
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="HandheldFriendly" content="true" />
        <meta name="MobileOptimized" content="width" />
        {/* Microsoft Tile Icon */}
        <meta name="msapplication-TileImage" content="https://pub-03210bb1ce9c4a419bd417ee47bd4e6d.r2.dev/logo-lap-wa.png" />
        {/* Running Title Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var originalTitle = 'Laporan WA Generator';
                var titleText = ' ★ Laporan WA Generator - Basarnas ';
                var position = 0;
                var isWindowActive = true;
                
                function scrollTitle() {
                  if (!isWindowActive) {
                    document.title = originalTitle;
                    return;
                  }
                  var scrollText = titleText.substring(position) + titleText.substring(0, position);
                  document.title = scrollText;
                  position++;
                  if (position >= titleText.length) {
                    position = 0;
                  }
                  setTimeout(scrollTitle, 200);
                }
                
                window.addEventListener('focus', function() {
                  isWindowActive = true;
                  scrollTitle();
                });
                
                window.addEventListener('blur', function() {
                  isWindowActive = false;
                  document.title = originalTitle;
                });
                
                // Start animation
                scrollTitle();
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0b0f1a] text-foreground`}
      >
        <CapacitorWrapper />
        <ClientWrapper>
          {children}
        </ClientWrapper>
        <Toaster />
        {/* Download App Button - Desktop Only */}
        <DownloadAppButton />
      </body>
    </html>
  );
}
