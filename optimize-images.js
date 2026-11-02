const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const IMAGE_FILE = /\.(jpe?g|png|webp|avif)$/i;
const QUALITY = 72;

function getAttribute(tag, name) {
  const match = tag.match(new RegExp('\\s' + name + '=["\']([^"\']*)["\']', 'i'));
  return match ? match[1] : '';
}

function setAttribute(tag, name, value) {
  const pattern = new RegExp('\\s' + name + '=["\'][^"\']*["\']', 'i');
  const attribute = ' ' + name + '="' + String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"';
  return pattern.test(tag) ? tag.replace(pattern, attribute) : tag.replace(/\s*\/?>(?=$)/, attribute + '>');
}

function removeAttribute(tag, name) {
  return tag.replace(new RegExp('\\s' + name + '=["\'][^"\']*["\']', 'i'), '');
}

async function optimizeImages(htmlFiles, srcDir, distDir) {
  const sources = new Set();
  for (const html of Object.values(htmlFiles)) {
    for (const tag of html.match(/<(?:img|video)\b[^>]*>/gi) || []) {
      const source = getAttribute(tag, /^<video/i.test(tag) ? 'data-poster' : 'src') || getAttribute(tag, 'poster');
      if (source.startsWith('assets/') && IMAGE_FILE.test(source)) sources.add(source);
    }
  }

  const images = new Map();
  const pending = [...sources];
  let before = 0;
  let previews = 0;
  let generated = 0;
  async function worker() {
    while (pending.length) {
      const source = pending.shift();
      const input = fs.readFileSync(path.join(srcDir, source));
      const metadata = await sharp(input).metadata();
      const rotated = metadata.orientation >= 5 && metadata.orientation <= 8;
      const width = rotated ? metadata.height : metadata.width;
      const height = rotated ? metadata.width : metadata.height;
      const avatar = source === 'assets/avatar.jpg';
      const widths = [...new Set((avatar ? [200, 400, 560] : [480, 960]).map(size => Math.min(size, width)))];
      const hash = crypto.createHash('sha256').update(input).update('webp-v1-quality-' + QUALITY).digest('hex').slice(0, 12);
      const relative = source.slice('assets/'.length).replace(IMAGE_FILE, '');
      const variants = [];
      for (const size of widths) {
        const filename = 'assets/optimized/' + relative + '-' + hash + '-' + size + '.webp';
        const output = path.join(distDir, filename);
        fs.mkdirSync(path.dirname(output), { recursive: true });
        const info = await sharp(input).rotate().resize({ width: size, withoutEnlargement: true })
          .webp({ quality: QUALITY, effort: 4 }).toFile(output);
        variants.push({ src: filename, width: info.width, height: info.height, bytes: info.size });
        generated += info.size;
      }
      // Existing photos are already at most 1920px. Preserve their detail for the lightbox.
      images.set(source, { variants, width, height, avatar, full: source });
      before += input.length;
      previews += variants[0].bytes;
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));

  const result = {};
  for (const [filename, html] of Object.entries(htmlFiles)) {
    result[filename] = html.replace(/<img\b[^>]*>/gi, tag => {
      const source = getAttribute(tag, 'src');
      const image = images.get(source);
      if (!image) return tag; // Includes the lightbox, which has no initial image.
      const gallery = !image.avatar && !/_thumb\./i.test(source);
      const candidates = image.variants.filter(item => item.width <= (image.avatar ? 560 : 960));
      const preview = candidates[0];
      const sizes = image.avatar ? '(max-width: 768px) 200px, 280px' :
        gallery ? '(max-width: 768px) calc(100vw - 48px), (max-width: 960px) calc((100vw - 68px) / 2), 446px' :
          '(min-width: 944px) 286px, (max-width: 768px) calc(100vw - 48px), calc((100vw - 76px) / 2)';
      tag = removeAttribute(tag, 'src');
      tag = setAttribute(tag, gallery ? 'data-src' : 'src', preview.src);
      tag = setAttribute(tag, gallery ? 'data-srcset' : 'srcset', candidates.map(item => item.src + ' ' + item.width + 'w').join(', '));
      tag = setAttribute(tag, 'sizes', sizes);
      tag = setAttribute(tag, 'width', image.width);
      tag = setAttribute(tag, 'height', image.height);
      tag = setAttribute(tag, 'loading', 'lazy');
      tag = setAttribute(tag, 'decoding', 'async');
      if (gallery) tag = setAttribute(tag, 'data-full', image.full);
      return tag;
    }).replace(/<video\b[^>]*>/gi, tag => {
      const image = images.get(getAttribute(tag, 'data-poster') || getAttribute(tag, 'poster'));
      if (!image) return tag;
      const preview = image.variants.filter(item => item.width <= 960).at(-1);
      return setAttribute(removeAttribute(tag, 'poster'), 'data-poster', preview.src);
    });
  }
  console.log(`  Images: ${sources.size}; originals ${(before / 1e6).toFixed(2)} MB; small previews ${(previews / 1e6).toFixed(2)} MB; all WebP sizes ${(generated / 1e6).toFixed(2)} MB`);
  return result;
}

module.exports = { optimizeImages, IMAGE_FILE };
