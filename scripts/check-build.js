const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'docs');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2].replace(/&amp;/g, '&')]));

async function main() {
  const sourceCount = (source.match(/class="gallery-item"/g) || []).length;
  const tags = (html.match(/<img\b[^>]*>/g) || []).map(attributes);
  const gallery = tags.filter(tag => tag['data-full']);
  assert.equal(gallery.length, sourceCount, 'Every gallery photo needs a preview and full-size image');
  const immediate = tags.filter(tag => tag.src?.startsWith('assets/'));
  const hero = immediate.filter(tag => /\bhero-photo\b/.test(tag.class || ''));
  assert.equal(hero.length, 1, 'The homepage needs exactly one priority hero image');
  assert.equal(hero[0].loading, 'eager');
  assert.equal(hero[0].fetchpriority, 'high');
  assert(immediate.filter(tag => tag !== hero[0]).every(tag => tag.loading === 'lazy'));
  const files = new Map();
  function imageFile(url) {
    assert(url.startsWith('assets/optimized/') && url.endsWith('.webp'), 'Only generated images should be referenced');
    const file = path.resolve(output, url);
    assert(file.startsWith(output + path.sep));
    assert(fs.existsSync(file), 'Missing image: ' + url);
    if (!files.has(file)) files.set(file, sharp(file).metadata());
    return files.get(file);
  }
  for (const tag of tags) {
    if (tag.id === 'lightboxImg') continue;
    const src = tag['data-src'] || tag.src;
    const preview = await imageFile(src);
    assert(+tag.width > 0 && +tag.height > 0, 'Images must reserve layout space');
    assert(Math.abs(preview.width / preview.height - +tag.width / +tag.height) < 0.02);
    const candidates = tag['data-srcset'] || tag.srcset;
    assert(candidates && tag.sizes, 'Responsive image candidates are required');
    for (const candidate of candidates.split(', ')) {
      const [url, width] = candidate.split(' ');
      assert.equal((await imageFile(url)).width + 'w', width);
    }
    if (tag['data-full']) {
      assert(!tag.src && !tag.srcset, 'Hidden galleries must wait for navigation');
      const fullPath = path.resolve(output, tag['data-full']);
      assert(fullPath.startsWith(output + path.sep) && fs.existsSync(fullPath));
      const full = await sharp(fullPath).metadata();
      assert(full.width >= preview.width && full.width <= 1920);
    }
  }
  for (const tag of (html.match(/<video\b[^>]*>/g) || []).map(attributes)) {
    assert.equal(tag.preload, 'none');
    assert(!tag.poster && tag['data-poster'], 'Video poster must wait for navigation');
    await imageFile(tag['data-poster']);
    assert(fs.existsSync(path.join(output, tag.src)), 'Video must be preserved');
  }
  console.log(`Verified ${gallery.length} gallery photos and ${files.size} generated image files.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
