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
      { src: '/favico/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { src: '/favico/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/favico/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
