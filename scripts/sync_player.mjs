import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const BA_STORY_DIR = path.resolve(ROOT, '..', 'BA-Story');

console.log('=== Syncing BA-Story to Website ===');
console.log('BA-Story source path:', BA_STORY_DIR);

if (!fs.existsSync(BA_STORY_DIR)) {
  console.error('Error: BA-Story repository not found at', BA_STORY_DIR);
  process.exit(1);
}

// 1. Build BA-Story library and standalone app
console.log('\n[1/3] Building BA-Story (lib + app)...');
execSync('npx pnpm build:lib', { cwd: BA_STORY_DIR, stdio: 'inherit' });
execSync('npx pnpm build:app', { cwd: BA_STORY_DIR, stdio: 'inherit' });

// 2. Sync library output to vendor/ba-story-player/dist
console.log('\n[2/3] Syncing library build to vendor/ba-story-player/dist...');
const vendorDist = path.join(ROOT, 'vendor', 'ba-story-player', 'dist');
fs.mkdirSync(vendorDist, { recursive: true });
fs.cpSync(path.join(BA_STORY_DIR, 'dist'), vendorDist, { recursive: true });
console.log('Copied to', vendorDist);

// 3. Sync standalone app output to public/player
console.log('\n[3/3] Syncing standalone app to public/player...');
const publicPlayer = path.join(ROOT, 'public', 'player');
fs.mkdirSync(publicPlayer, { recursive: true });
fs.cpSync(path.join(BA_STORY_DIR, 'dist-app'), publicPlayer, { recursive: true });

// Ensure index.html exists in public/player
const playerHtml = path.join(publicPlayer, 'player.html');
const indexHtml = path.join(publicPlayer, 'index.html');
if (fs.existsSync(playerHtml) && !fs.existsSync(indexHtml)) {
  fs.copyFileSync(playerHtml, indexHtml);
}

console.log('\n=== BA-Story synced successfully to website! ===');
