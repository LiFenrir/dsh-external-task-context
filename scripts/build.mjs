/**
 * Build both bundle halves into lib/.
 *
 * - lib/index.js: host half, neutral ESM, self-contained.
 * - lib/client.js: browser half as a CJS closure registered through
 *   `window.__ModuleLoader__.load({ id, factory })`. `react` and
 *   `react/jsx-runtime` stay external because the loader resolves them from
 *   the platform baseline.
 *
 * Any esbuild failure rejects the top-level await and exits non-zero.
 */
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LIB = join(ROOT, 'lib')
const PLUGIN_ID = '@lifenrir/dsh-external-task-context'

mkdirSync(LIB, { recursive: true })

await build({
  entryPoints: [join(ROOT, 'src', 'index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  outfile: join(LIB, 'index.js'),
  logLevel: 'warning',
})

const client = await build({
  entryPoints: [join(ROOT, 'src', 'client', 'index.tsx')],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'],
  sourcemap: false,
  write: false,
  logLevel: 'warning',
})

// esbuild's CJS output assigns `module.exports`, so the wrapper must provide
// both `module` and `exports` before the body runs.
const body = client.outputFiles[0].text
const wrapped = [
  `window.__ModuleLoader__.load({`,
  `  id: ${JSON.stringify(PLUGIN_ID)},`,
  `  factory: (require) => {`,
  `    var module = { exports: {} }; var exports = module.exports;`,
  body,
  `    return module.exports`,
  `  },`,
  `})`,
  ``,
].join('\n')

await writeFile(join(LIB, 'client.js'), wrapped)
