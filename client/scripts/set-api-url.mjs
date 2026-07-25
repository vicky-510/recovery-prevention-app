/**
 * Writes the production API URL into the environment file before a build.
 *
 * Angular resolves environment files at build time, so the URL cannot be read
 * from the process at runtime. This runs automatically via the `prebuild`
 * script, and takes the value from `API_BASE_URL` — set it in the host's build
 * environment (on Netlify: Site configuration → Environment variables).
 *
 * With the variable unset, the committed file is left untouched, so local
 * builds and `ng build` on its own keep working.
 */
import fs from 'node:fs/promises';

const TARGET = new URL('../src/environments/environment.prod.ts', import.meta.url);
const url = process.env.API_BASE_URL?.trim();

if (!url) {
  console.log('API_BASE_URL is not set; keeping the committed environment file.');
  process.exit(0);
}

if (!/^https?:\/\/[^\s'"]+$/.test(url)) {
  console.error(`API_BASE_URL is not a valid URL: ${url}`);
  process.exit(1);
}

// A trailing slash would produce "//api/..." once joined.
const apiBase = url.replace(/\/+$/, '');

await fs.writeFile(
  TARGET,
  `/**
 * Generated at build time from API_BASE_URL. Edits here are overwritten
 * whenever that variable is set; see client/scripts/set-api-url.mjs.
 */
export const environment = {
  apiBase: '${apiBase}',
};
`
);

console.log(`Building against ${apiBase}`);
