import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/ui/Navbar';
import BottomNav from '@/components/ui/BottomNav';
import Toast from '@/components/ui/Toast';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'Bolão Copa do Mundo 2026',
  description: 'Palpite nos jogos da Copa do Mundo, acumule pontos e dispute com seus amigos no ranking geral!',
  keywords: ['copa do mundo', 'bolão', 'futebol', 'amigos', 'palpites'],
};

export const viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  var dark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (dark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${outfit.className} min-h-full flex flex-col bg-base text-primary selection:bg-accent-custom selection:text-slate-950 pb-16 sm:pb-0`}>
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
        <BottomNav />
        <Toast />
      </body>
    </html>
  );
}
