import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import './globals.css';
import 'shepherd.js/dist/css/shepherd.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import Script from 'next/script';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Anita Deploy - Deploy Anita-V5 with Ease',
  description: 'Effortlessly deploy your Anita-V4 WhatsApp bot to your chosen platform.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google AdSense preconnect (optional) */}
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
      </head>
      <body className={cn(inter.variable, "font-sans antialiased")}>
        <ThemeProvider
          defaultTheme="light"
          storageKey="anita-deploy-theme"
        >
          {children}
          <Toaster />

          {/* Google AdSense Implementation */}
          <Script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9230418530624208"
            crossOrigin="anonymous"
            strategy="afterInteractive"
            id="adsense-script"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}

