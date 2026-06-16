import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bolão Copa do Mundo 2026',
    short_name: 'Bolão Copa 2026',
    description: 'Palpite nos jogos da Copa do Mundo 2026, acumule pontos e dispute com seus amigos no ranking geral!',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    orientation: 'portrait',
    lang: 'pt-BR',
    icons: [
      { src: '/icon-192', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
