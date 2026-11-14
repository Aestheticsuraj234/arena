// Copies Monaco's AMD build into public/, so the editor loads from this app
// instead of a CDN (works offline and behind strict networks).
import {cpSync, existsSync, realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// monaco-editor's `exports` hide package.json, so resolve the folder directly.
const source = realpathSync(
  fileURLToPath(new URL('../node_modules/monaco-editor/min/vs', import.meta.url)),
);
const target = fileURLToPath(new URL('../public/monaco/vs', import.meta.url));

if (!existsSync(`${target}/loader.js`)) {
  cpSync(source, target, {recursive: true});
  console.log('Copied Monaco to public/monaco/vs');
}
