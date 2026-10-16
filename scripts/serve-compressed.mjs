// Tiny static server for lab measurements: serves a build directory with gzip, long-cache assets and SPA fallback —
// roughly what a real host does. (vite preview serves everything uncompressed, which overstates transfer cost.)
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { extname, join, normalize } from 'node:path'

const dir = process.argv[2] ?? 'dist'
const port = Number(process.argv[3] ?? 4175)
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.webp': 'image/webp', '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.txt': 'text/plain' }
const compressible = new Set(['.html', '.js', '.css', '.svg', '.txt'])
const cache = new Map()
const csp = process.env.CSP // optional Content-Security-Policy header, used by scripts/test-csp.mjs

createServer((req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
  let file = join(dir, path)
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'index.html')
  const ext = extname(file)
  const headers = { 'Content-Type': types[ext] ?? 'application/octet-stream', 'Cache-Control': file.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' }
  let body = cache.get(file) ?? readFileSync(file)
  cache.set(file, body)
  if (ext === '.mp4') {
    const range = req.headers.range
    if (range) {
      const [a, b] = range.replace('bytes=', '').split('-')
      const start = Number(a)
      const end = b ? Number(b) : body.length - 1
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 })
      return res.end(body.subarray(start, end + 1))
    }
    headers['Accept-Ranges'] = 'bytes'
  }
  if (compressible.has(ext) && /gzip/.test(req.headers['accept-encoding'] ?? '')) {
    const key = file + ':gz'
    body = cache.get(key) ?? gzipSync(body)
    cache.set(key, body)
    headers['Content-Encoding'] = 'gzip'
  }
  if (csp && ext === '.html') headers['Content-Security-Policy'] = csp
  headers['Content-Length'] = body.length
  res.writeHead(200, headers)
  res.end(body)
}).listen(port, '127.0.0.1', () => console.log(`serving ${dir} on http://127.0.0.1:${port}`))
