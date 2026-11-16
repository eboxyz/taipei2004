import manifest from '../generated/art-manifest.json';

type Category = 'characters' | 'areas' | 'areas_px' | 'crests' | 'key' | 'lots' | 'events' | 'map' | 'sprites';

/** Pixel art is copied as PNG so it stays crisp; illustrated art is WebP. */
const PIXEL: Category[] = ['lots', 'events', 'sprites', 'areas_px'];

const sets: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(manifest as Record<string, string[]>).map(([k, v]) => [k, new Set(v)]),
);

/** URL for a processed art file, or null when it hasn't been made yet (show a placeholder). */
export function artUrl(category: Category, id: string): string | null {
  if (!sets[category]?.has(id)) return null;
  const ext = PIXEL.includes(category) ? 'png' : 'webp';
  return `${import.meta.env.BASE_URL}art/${category}/${id}.${ext}`;
}
