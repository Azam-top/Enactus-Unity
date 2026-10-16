import { appendFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const LOCALES = ['kk', 'ru', 'en']

/**
 * Search/social metadata that needs the real production origin. The owner has not supplied one yet, so nothing
 * is invented: with VITE_SITE_URL unset the build is unchanged. With it set (docs/LAUNCH-CHECKLIST.md) the build adds
 * canonical, hreflang, og:url, og:image, a sitemap and the robots.txt Sitemap line.
 */
function seo(siteUrl: string): Plugin {
  const origin = siteUrl.trim().replace(/\/+$/, '')
  let outDir = 'dist'
  return {
    name: 'enactus-seo',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    transformIndexHtml(html) {
      if (!origin) return html
      const tags = [
        `<link rel="canonical" href="${origin}/kk" />`,
        ...LOCALES.map((l) => `<link rel="alternate" hreflang="${l}" href="${origin}/${l}" />`),
        `<link rel="alternate" hreflang="x-default" href="${origin}/kk" />`,
        `<meta property="og:url" content="${origin}/kk" />`,
        `<meta property="og:image" content="${origin}/og-card.jpg" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
      ]
      return html.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`)
    },
    generateBundle() {
      if (!origin) return
      const urls = LOCALES.flatMap((l) => [`${origin}/${l}`, `${origin}/${l}/privacy`])
      const alternates = (loc: string) =>
        LOCALES.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${origin}/${l}${loc.endsWith('/privacy') ? '/privacy' : ''}" />`).join('\n')
      const body = urls.map((u) => `  <url>\n    <loc>${u}</loc>\n${alternates(u)}\n  </url>`).join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`,
      })
    },
    closeBundle() {
      const robots = resolve(outDir, 'robots.txt')
      if (origin && existsSync(robots)) appendFileSync(robots, `\nSitemap: ${origin}/sitemap.xml\n`)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return { plugins: [react(), seo(env.VITE_SITE_URL ?? '')] }
})
