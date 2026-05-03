#!/usr/bin/env node
/**
 * Rasterise the SVG mark sources into PNG fallbacks for PWA installs and
 * legacy browsers that don't accept SVG icons in the manifest.
 *
 * Usage:  npm run build:icons
 *
 * Source SVGs (single source of truth — edit these to update the mark):
 *   public/icon.svg                  — 64×64 transparent
 *   public/icons/icon-maskable.svg   — 512×512 with bg + safe-zone padding
 *
 * Output PNGs (regenerated each run; safe to commit):
 *   public/icons/icon-192.png         (192×192, transparent)
 *   public/icons/icon-512.png         (512×512, transparent)
 *   public/icons/icon-maskable-512.png (512×512, opaque navy bg)
 *
 * sharp is pulled in transitively by Next, so no extra dependency.
 */

import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')

const targets = [
  { src: 'icon.svg',                  out: 'icons/icon-192.png',          size: 192 },
  { src: 'icon.svg',                  out: 'icons/icon-512.png',          size: 512 },
  { src: 'icons/icon-maskable.svg',   out: 'icons/icon-maskable-512.png', size: 512 },
]

for (const t of targets) {
  const src = resolve(publicDir, t.src)
  const out = resolve(publicDir, t.out)
  const svg = await readFile(src)
  // density bumps the rasteriser's internal DPI so the small viewBox doesn't
  // get aliased when scaled up to 192/512. 384 dpi is overkill but cheap.
  await sharp(svg, { density: 384 })
    .resize(t.size, t.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(out)
  console.log(`  ✓ ${t.src} → ${t.out} (${t.size}×${t.size})`)
}

console.log('Done — 3 icon PNGs regenerated.')
