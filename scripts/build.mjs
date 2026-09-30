// Builds the deployable site into _site/.
// 1) Merges each content folder (data/<name>/*.json, edited in Pages CMS)
//    into one file (_site/data/<name>.json) that the pages read.
// 2) Copies pages, assets, and single-file data.
// Run locally with:  node scripts/build.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, '_site');
const COLLECTIONS = ['publications', 'patents', 'news', 'people', 'research', 'projects', 'programs', 'photos'];
const SINGLE_FILES = ['site.json', 'professor.json', 'talks.json', 'press.json', 'collaborations.json'];
const COPY = ['index.html', 'research.html', 'professor.html', 'people.html', 'publications.html', 'patents.html', 'projects.html', 'news.html', 'photos.html', '404.html', 'robots.txt', 'sitemap.xml', 'assets'];

let errors = 0;
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'data'), { recursive: true });

for (const name of COLLECTIONS) {
  const dir = path.join(ROOT, 'data', name);
  const items = [];
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
      try {
        const obj = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        obj._id = file.replace(/\.json$/, '');
        items.push(obj);
      } catch (e) {
        errors++;
        console.error(`✗ data/${name}/${file} is not valid JSON: ${e.message}`);
      }
    }
  }
  fs.writeFileSync(path.join(OUT, 'data', `${name}.json`), JSON.stringify(items));
  console.log(`✓ ${name}: ${items.length} items`);
}

for (const file of SINGLE_FILES) {
  const src = path.join(ROOT, 'data', file);
  try {
    JSON.parse(fs.readFileSync(src, 'utf8'));
    fs.copyFileSync(src, path.join(OUT, 'data', file));
  } catch (e) {
    errors++;
    console.error(`✗ data/${file}: ${e.message}`);
  }
}

fs.writeFileSync(path.join(OUT, 'data', 'meta.json'), JSON.stringify({ updated: new Date().toISOString() }));

for (const item of COPY) {
  const src = path.join(ROOT, item);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(OUT, item), { recursive: true });
}

// Add a version to CSS/JS links so browsers load the new files after each deploy.
const VERSION = Date.now().toString(36);
for (const file of fs.readdirSync(OUT).filter(f => f.endsWith('.html'))) {
  const p = path.join(OUT, file);
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/(assets\/(?:css|js)\/[\w.-]+\.(?:css|js))"/g, `$1?v=${VERSION}"`));
}

if (errors) {
  console.error(`\n${errors} file(s) could not be read. Fix them and push again.`);
  process.exit(1);
}
console.log('\nBuild finished: _site/');
