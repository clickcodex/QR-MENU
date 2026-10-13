import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MOMO MENU — Instant QR Digital Restaurant Menu',
  description: 'Fast, frictionless digital restaurant menu platform. Point your phone camera, instantly browse delicious food with no app download or registration.',
  keywords: 'digital restaurant menu, QR menu, MOMO MENU, contact-free restaurant menu, food menu QR',
  authors: [{ name: 'MOMO MENU' }],
  openGraph: {
    title: 'MOMO MENU — Digital QR Menu Platform',
    description: 'Instant, app-less mobile restaurant menu. Scan QR code on your table and browse dishes effortlessly.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FFFFFF',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`bg-[#FAFAF8] ${plusJakartaSans.variable} ${playfairDisplay.variable}`}>
      <body className={`min-h-screen text-[#1C1917] bg-[#FAFAF8] antialiased selection:bg-[#FED7AA] selection:text-[#9A3412] ${plusJakartaSans.className}`}>
        {children}
      </body>
    </html>
  );
}
