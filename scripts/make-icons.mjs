// Regenerates the PWA icon set from the fork mark. Run after changing the
// logo: node scripts/make-icons.mjs
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'

const fork = (scale) => `
  <g fill="#faf5ee" transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <rect x="192" y="118" width="26" height="120" rx="13"/>
    <rect x="243" y="118" width="26" height="120" rx="13"/>
    <rect x="294" y="118" width="26" height="120" rx="13"/>
    <rect x="192" y="196" width="128" height="58" rx="29"/>
    <rect x="241" y="220" width="30" height="182" rx="15"/>
  </g>`

const grad = `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#b97f42"/><stop offset="1" stop-color="#8a5628"/>
  </linearGradient></defs>`

const rounded = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">${grad}<rect width="512" height="512" rx="115" fill="url(#bg)"/>${fork(1)}</svg>`
// Full bleed for surfaces that apply their own mask (Android maskable, iOS).
const fullBleed = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">${grad}<rect width="512" height="512" fill="url(#bg)"/>${fork(0.8)}</svg>`

async function render(svg, size, file) {
  const png = await sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toBuffer()
  await writeFile(new URL(`../public/${file}`, import.meta.url), png)
  console.log(file, png.length, 'bytes')
}

await render(rounded, 512, 'pwa-512x512.png')
await render(rounded, 192, 'pwa-192x192.png')
await render(fullBleed, 512, 'pwa-maskable-512x512.png')
await render(fullBleed, 180, 'apple-touch-icon.png')
