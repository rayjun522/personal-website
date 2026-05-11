const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');
const MAX_WIDTH = 1920;
const QUALITY = 80;

let totalBefore = 0;
let totalAfter = 0;
let count = 0;

function walkDir(dir) {
  const tasks = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      tasks.push(...walkDir(fullPath));
    } else if (/\.(jpe?g|png)$/i.test(entry.name)) {
      tasks.push(compress(fullPath));
    }
  }
  return tasks;
}

async function compress(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return; // skip PNG files

  const before = fs.statSync(filePath).size;
  totalBefore += before;

  try {
    const tmpPath = filePath + '.tmp';
    await sharp(filePath)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toFile(tmpPath);

    const after = fs.statSync(tmpPath).size;

    if (after < before) {
      fs.unlinkSync(filePath);
      fs.renameSync(tmpPath, filePath);
      totalAfter += after;
      count++;
      const pct = ((before - after) / before * 100).toFixed(0);
      console.log(`  ${path.basename(filePath)}: ${(before/1024).toFixed(0)}KB -> ${(after/1024).toFixed(0)}KB (-${pct}%)`);
    } else {
      fs.unlinkSync(tmpPath);
      totalAfter += before;
      console.log(`  ${path.basename(filePath)}: skipped (already optimized)`);
    }
  } catch (err) {
    console.error(`  Error: ${filePath} - ${err.message}`);
    totalAfter += before;
  }
}

async function main() {
  console.log('Compressing images...\n');
  const tasks = walkDir(assetsDir);
  await Promise.all(tasks);

  const savedMB = ((totalBefore - totalAfter) / 1024 / 1024).toFixed(1);
  const pct = ((totalBefore - totalAfter) / totalBefore * 100).toFixed(0);
  console.log(`\n  Done! ${count} images compressed.`);
  console.log(`  Total: ${(totalBefore/1024/1024).toFixed(0)}MB -> ${(totalAfter/1024/1024).toFixed(0)}MB (saved ${savedMB}MB, -${pct}%)`);
}

main().catch(err => { console.error(err); process.exit(1); });
