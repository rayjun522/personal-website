const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier');
const CleanCSS = require('clean-css');
const { minify: terserMinify } = require('terser');

const srcDir = __dirname;
const distDir = path.join(__dirname, 'docs');

function copyFolder(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyFolder(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  // Ensure dist directory
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copy assets folder (images, etc.) unchanged
  const assetsDir = path.join(srcDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    copyFolder(assetsDir, path.join(distDir, 'assets'));
  }

  // Process HTML files
  const htmlFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.html'));
  for (const file of htmlFiles) {
    console.log(`  Building ${file}...`);
    const html = fs.readFileSync(path.join(srcDir, file), 'utf8');
    const result = minify(html, {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      minifyCSS: true,
      minifyJS: true,
      sortClassName: true,
      sortAttributes: true,
    });
    fs.writeFileSync(path.join(distDir, file), result);
    const saved = ((html.length - result.length) / html.length * 100).toFixed(0);
    console.log(`    ${file}: ${(html.length/1024).toFixed(1)} KB -> ${(result.length/1024).toFixed(1)} KB (-${saved}%)`);
  }

  // Process CSS files
  const cssDir = path.join(srcDir, 'css');
  if (fs.existsSync(cssDir)) {
    const distCssDir = path.join(distDir, 'css');
    if (!fs.existsSync(distCssDir)) fs.mkdirSync(distCssDir, { recursive: true });

    const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
    for (const file of cssFiles) {
      console.log(`  Processing ${file}...`);
      const css = fs.readFileSync(path.join(cssDir, file), 'utf8');
      const result = new CleanCSS({ level: 2 }).minify(css);
      fs.writeFileSync(path.join(distCssDir, file), result.styles);
      const saved = ((css.length - result.styles.length) / css.length * 100).toFixed(0);
      console.log(`    css/${file}: ${(css.length/1024).toFixed(1)} KB -> ${(result.styles.length/1024).toFixed(1)} KB (-${saved}%)`);
    }
  }

  // Process JS files
  const jsDir = path.join(srcDir, 'js');
  if (fs.existsSync(jsDir)) {
    const distJsDir = path.join(distDir, 'js');
    if (!fs.existsSync(distJsDir)) fs.mkdirSync(distJsDir, { recursive: true });

    const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
    for (const file of jsFiles) {
      console.log(`  Obfuscating ${file}...`);
      const js = fs.readFileSync(path.join(jsDir, file), 'utf8');
      const result = await terserMinify(js, {
        compress: { drop_console: true, passes: 2 },
        mangle: { toplevel: true },
        output: { beautify: false, comments: false },
      });
      fs.writeFileSync(path.join(distJsDir, file), result.code);
      const saved = ((js.length - result.code.length) / js.length * 100).toFixed(0);
      console.log(`    js/${file}: ${(js.length/1024).toFixed(1)} KB -> ${(result.code.length/1024).toFixed(1)} KB (-${saved}%)`);
    }
  }

  console.log('\n  Done! Upload the "docs" folder.');
}

main().catch(err => { console.error(err); process.exit(1); });
