// Generate static GeoBoundaries countries list from gbOpen ALL/ADM0 metadata
// Usage: node scripts/generate-gb-countries.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const ASSET_PATH = path.join(ROOT, 'assets', 'geoboundaries-countries.json');
const RELEASE = 'gbOpen';
const URL = `https://www.geoboundaries.org/api/current/${RELEASE}/ALL/ADM0/`;

function pickIso(item) {
  const candidates = [item?.boundaryISO, item?.shapeGroup, item?.ISO3, item?.iso3, item?.ISO, item?.iso];
  for (const v of candidates) {
    if (v && String(v).trim()) return String(v).trim();
  }
  return null;
}

function pickName(item) {
  const candidates = [item?.boundaryName, item?.COUNTRY, item?.name, item?.country, item?.shapeName];
  for (const v of candidates) {
    if (v && String(v).trim()) return String(v).trim();
  }
  return null;
}

async function main() {
  console.log(`Fetching: ${URL}`);
  const resp = await fetch(URL);
  if (!resp.ok) {
    throw new Error(`Failed to fetch ${URL}: ${resp.status} ${resp.statusText}`);
  }
  const body = await resp.json();
  if (!Array.isArray(body)) {
    throw new Error('Unexpected response: not an array');
  }
  const map = new Map();
  for (const item of body) {
    const iso = pickIso(item);
    if (!iso) continue;
    const name = pickName(item) || iso;
    if (!map.has(iso)) map.set(iso, name);
  }

  const arr = Array.from(map.entries()).map(([value, displayName]) => ({ value, displayName }));
  arr.sort((a, b) => a.displayName.localeCompare(b.displayName));

  await fs.mkdir(path.dirname(ASSET_PATH), { recursive: true });
  await fs.writeFile(ASSET_PATH, JSON.stringify(arr, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${arr.length} countries to ${ASSET_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
