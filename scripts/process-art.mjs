/**
 * Turns art/source/** into game-ready files in public/art/** and writes
 * src/generated/art-manifest.json so the game knows which art exists.
 *
 *   npm run art
 *
 * Source sizes come from art/BRIEF.md. Anything missing just stays a placeholder in game.
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'art/source');
const OUT = path.join(ROOT, 'public/art');
const MANIFEST = path.join(ROOT, 'src/generated/art-manifest.json');

/** How each category is cropped and sized. */
const RULES = {
  // 2:3 portrait → 3:4 card, top-aligned so heads are never cut.
  characters: { width: 600, height: 800, position: 'top' },
  // 3:2 scene → 2.4:1 banner strip from the middle.
  areas: { width: 1200, height: 500, position: 'centre' },
  crests: { width: 512, height: 512, fit: 'contain' },
  // 2:3 → 9:16, centered.
  key: { width: 720, height: 1280, position: 'centre' },
  // Map stickers show at 40–76px. Trim the empty margin so each fills its box, longest side 256.
  map: { width: 256, height: 256, fit: 'inside', trim: true },
  // PixelLab icons: keep pixels crisp.
  lots: { pixel: true },
  events: { pixel: true },
  // PixelLab battle sprites (64×64, facing south-east): copied as-is, drawn at whole-number scales.
  sprites: { pixel: true },
};

/** The brief used a few longer file names than the game's data ids. */
const ALIASES = {
  areas: { east_district: 'east' },
  events: { scratch_card: 'scratch' },
  crests: {
    miaokou_gang: 'miaokou',
    molong_society: 'molong',
    yuejian_society: 'yuejian',
    jin_tangchi_group: 'jintangchi',
    tongtian_development: 'tongtian',
    xiaoxiao_realty: 'xiaoxiao',
    player_agency: 'agency',
  },
};

function gameId(category, file) {
  let id = path.basename(file, '.png');
  for (const [from, to] of Object.entries(ALIASES[category] ?? {})) {
    if (id === from || id.startsWith(`${from}_`)) id = to + id.slice(from.length);
  }
  return id;
}

async function listPngs(dir) {
  if (!existsSync(dir)) return [];
  return (await readdir(dir)).filter((f) => f.toLowerCase().endsWith('.png'));
}

const manifest = {};
let count = 0;

for (const [category, rule] of Object.entries(RULES)) {
  const files = await listPngs(path.join(SRC, category));
  manifest[category] = [];
  if (files.length === 0) continue;
  await mkdir(path.join(OUT, category), { recursive: true });
  for (const file of files) {
    const id = gameId(category, file);
    const input = path.join(SRC, category, file);
    if (rule.pixel) {
      await sharp(input).png().toFile(path.join(OUT, category, `${id}.png`));
    } else {
      await (rule.trim ? sharp(input).trim() : sharp(input))
        .resize(rule.width, rule.height, {
          fit: rule.fit ?? 'cover',
          position: rule.position ?? 'centre',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ quality: 82, alphaQuality: 90 })
        .toFile(path.join(OUT, category, `${id}.webp`));
    }
    manifest[category].push(id);
    count += 1;
  }
  manifest[category].sort();
}

// Battle backdrops: each area's 3:2 source scene cropped to 5:4 around the middle, shrunk to 130×104
// and cut to 32 colours, so it reads as pixel art when the stage draws it back up (~3×) with hard pixels.
const banners = await listPngs(path.join(SRC, 'areas'));
manifest.areas_px = [];
if (banners.length > 0) {
  await mkdir(path.join(OUT, 'areas_px'), { recursive: true });
  for (const file of banners) {
    const id = gameId('areas', file);
    await sharp(path.join(SRC, 'areas', file))
      .resize(130, 104, { fit: 'cover', position: 'centre' })
      .png({ palette: true, colors: 32, dither: 0 })
      .toFile(path.join(OUT, 'areas_px', `${id}.png`));
    manifest.areas_px.push(id);
    count += 1;
  }
  manifest.areas_px.sort();
}

await mkdir(path.dirname(MANIFEST), { recursive: true });
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Processed ${count} images.`);
for (const [k, v] of Object.entries(manifest)) console.log(`  ${k.padEnd(10)} ${v.length ? v.join(', ') : '—'}`);
