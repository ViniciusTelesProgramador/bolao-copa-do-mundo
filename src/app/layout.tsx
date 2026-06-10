import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/ui/Navbar';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'Bolão Copa do Mundo 2026',
  description: 'Palpite nos jogos da Copa do Mundo, acumule pontos e dispute com seus amigos no ranking geral!',
  keywords: ['copa do mundo', 'bolão', 'futebol', 'amigos', 'palpites'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} h-full antialiased dark`}>
      <body className={`${outfit.className} min-h-full flex flex-col bg-[#0f172a] text-slate-100 selection:bg-[#22c55e] selection:text-slate-950`}>
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
      </body>
    </html>
  );
}
