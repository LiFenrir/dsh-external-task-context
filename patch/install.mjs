#!/usr/bin/env node
/**
 * Install the run-log-capable patched Claude Code subagent provider into an
 * existing DSH profile without touching package.json or running pnpm.
 *
 * The installer downloads the official provider sources for one DSH release
 * tag (or reads them from `--source`), replaces `index.ts`, `run.ts`, and
 * `log.ts` with the patched copies in this package, bundles them with esbuild,
 * backs up the installed `lib/index.js`, and replaces it in place.
 *
 * @module dsh-external-task-context-patch/install
 */

import { spawnSync } from 'node:child_process'
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import {
  backupProfileDir,
  backupsRoot,
  discoverProfiles,
  isMatchingActiveRecord,
  PATCHED_SRC_FILES,
  parseArgs,
  PROVIDER_PACKAGE_NAME,
  PROVIDER_SRC_FILES,
  providerDirFor,
  rawSourceUrl,
  resolveDshHome,
  runLogDirectory,
  tagToVersion,
  timestampDir,
  versionMatchesTag,
} from './lib.mjs'

const PACKAGE_ROOT = dirname(fileURLToPath(import.meta.url))
const DOWNLOAD_TIMEOUT_MS = 30_000
const VERIFY_TIMEOUT_MS = 60_000
const VERIFY_SCRIPT = "const m = await import('./lib/index.js'); if (m.name !== 'subagent-claude-code' || m.Config({}).persistNativeTranscript !== true) throw new Error('patch verification failed')"
const PROXY_GUIDANCE = [
  'If DSH runs behind a proxy, re-run with NODE_USE_ENV_PROXY=1 and HTTPS_PROXY set,',
  'or pass --source <dir> pointing at a local deepseek-harness checkout.',
].join('\n')

/**
 * Entry point.
 * @param {readonly string[]} argv - arguments without the executable and script.
 * @returns {Promise<void>}
 */
async function main(argv) {
  const options = parseArgs(argv)
  if (options.help) {
    printHelp()
    return
  }
  // Fail early on a malformed tag rather than after touching a profile.
  tagToVersion(options.tag)

  const dshHome = resolveDshHome(options.dshHome)
  const profiles = await selectProfiles(options, dshHome)

  if (options.restore) {
    for (const profile of profiles) {
      await restoreProfile({ options, dshHome, profile })
    }
    return
  }

  const targets = []
  for (const profile of profiles) {
    targets.push(await resolveTarget({ dshHome, profile }))
  }
  for (const target of targets) {
    assertVersionMatches(target, options)
  }

  const tempRoot = await mkdtemp(join(tmpdir(), 'dsh-ect-patch-'))
  try {
    const sources = await acquireSources(options)
    validateOfficialIndex(sources['index.ts'], options)
    const bundlePath = await buildBundle(sources, tempRoot)
    const bundleSize = await assertBuiltBundle(bundlePath)

    if (options.dryRun) {
      await syntaxCheck(bundlePath, tempRoot)
      for (const target of targets) {
        await printDryRun({ options, dshHome, target, bundleSize })
      }
      return
    }

    for (const target of targets) {
      await installTarget({ options, dshHome, target, bundlePath })
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
}

/**
 * Select profiles from explicit flags or discovery.
 * @param {ReturnType<typeof parseArgs>} options - parsed CLI options.
 * @param {string} dshHome - absolute DSH home.
 * @returns {Promise<string[]>} profile names to process.
 */
async function selectProfiles(options, dshHome) {
  if (options.profiles.length > 0) {
    return options.profiles
  }
  const profilesRoot = join(dshHome, 'profiles')
  const discovered = await discoverProfiles(dshHome)
  if (discovered.length === 0) {
    throw new Error(
      `no profile with ${PROVIDER_PACKAGE_NAME} installed under ${profilesRoot}; `
      + 'pass --profile <name> or --dsh-home <path>',
    )
  }
  if (discovered.length > 1 && !options.yes) {
    throw new Error(
      `multiple profiles found (${discovered.join(', ')}); pass --profile <name> `
      + '(repeatable) to select one, or --yes to patch all',
    )
  }
  return discovered
}

/**
 * Resolve one profile's installed provider package.
 * @param {{ dshHome: string, profile: string }} input - DSH home and profile name.
 * @returns {Promise<{ profile: string, profileDir: string, providerDir: string, version: string }>}
 */
async function resolveTarget({ dshHome, profile }) {
  const profileDir = join(dshHome, 'profiles', profile)
  const link = providerDirFor(profileDir)
  let providerDir
  try {
    providerDir = await realpath(link)
  } catch {
    throw new Error(`profile "${profile}": ${PROVIDER_PACKAGE_NAME} is not installed at ${link}`)
  }
  let pkg
  try {
    pkg = JSON.parse(await readFile(join(providerDir, 'package.json'), 'utf8'))
  } catch (error) {
    throw new Error(
      `profile "${profile}": cannot read ${join(providerDir, 'package.json')}: `
      + `${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (pkg.name !== PROVIDER_PACKAGE_NAME) {
    throw new Error(
      `profile "${profile}": ${providerDir} is package ${JSON.stringify(pkg.name)}, `
      + `expected ${PROVIDER_PACKAGE_NAME}`,
    )
  }
  if (typeof pkg.version !== 'string' || pkg.version.length === 0) {
    throw new Error(`profile "${profile}": provider package.json has no version`)
  }
  return { profile, profileDir, providerDir, version: pkg.version }
}

/**
 * Reject or warn about a provider-version/tag mismatch.
 * @param {{ profile: string, version: string }} target - resolved profile target.
 * @param {ReturnType<typeof parseArgs>} options - parsed CLI options.
 */
function assertVersionMatches(target, options) {
  if (versionMatchesTag(target.version, options.tag)) return
  const message = `profile "${target.profile}": installed provider ${target.version} `
    + `does not match tag ${options.tag} (tag maps to version ${tagToVersion(options.tag)})`
  if (!options.force) {
    throw new Error(`${message}; pass --force to install anyway`)
  }
  console.warn(`WARNING: ${message}; continuing because --force was passed.`)
}

/**
 * Read the official provider sources from `--source` or GitHub.
 * @param {ReturnType<typeof parseArgs>} options - parsed CLI options.
 * @returns {Promise<Record<string, string>>} source text keyed by file name.
 */
async function acquireSources(options) {
  if (options.source !== undefined) {
    const sourceDir = resolve(options.source)
    const sources = {}
    for (const file of PROVIDER_SRC_FILES) {
      try {
        sources[file] = await readFile(join(sourceDir, file), 'utf8')
      } catch {
        throw new Error(`--source directory ${sourceDir} is missing ${file}`)
      }
    }
    return sources
  }

  const sources = {}
  for (const file of PROVIDER_SRC_FILES) {
    const url = rawSourceUrl(options.tag, file)
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`)
      }
      sources[file] = await response.text()
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`failed to download ${url}: ${reason}\n${PROXY_GUIDANCE}`)
    }
  }
  return sources
}

/**
 * Confirm the official source really is the Claude Code subagent provider.
 * @param {string} indexSource - downloaded `index.ts`.
 * @param {ReturnType<typeof parseArgs>} options - parsed CLI options.
 */
function validateOfficialIndex(indexSource, options) {
  if (!/export\s+const\s+name\s*=\s*['"]subagent-claude-code['"]/.test(indexSource)) {
    throw new Error(
      `index.ts for tag ${options.tag} does not export name = 'subagent-claude-code'; `
      + 'check --tag or --source',
    )
  }
}

/**
 * Assemble patched sources in a temp directory and bundle them with esbuild.
 * @param {Record<string, string>} sources - official source text keyed by file name.
 * @param {string} tempRoot - temporary working directory.
 * @returns {Promise<string>} path to the built `out/index.js`.
 */
async function buildBundle(sources, tempRoot) {
  const srcDir = join(tempRoot, 'src')
  const outDir = join(tempRoot, 'out')
  await mkdir(srcDir, { recursive: true })
  await mkdir(outDir, { recursive: true })

  await writeFile(join(srcDir, 'process.ts'), sources['process.ts'])
  for (const file of PATCHED_SRC_FILES) {
    await copyFile(join(PACKAGE_ROOT, 'src', file), join(srcDir, file))
  }

  const outfile = join(outDir, 'index.js')
  try {
    await build({
      entryPoints: [join(srcDir, 'index.ts')],
      outfile,
      bundle: true,
      format: 'esm',
      platform: 'node',
      target: 'node20',
      packages: 'external',
      logLevel: 'silent',
    })
  } catch (error) {
    const details = Array.isArray(error?.errors) && error.errors.length > 0
      ? error.errors.map((item) => {
        const location = item.location === undefined || item.location === null
          ? ''
          : ` (${item.location.file}:${item.location.line})`
        return `${item.text}${location}`
      }).join('\n')
      : (error instanceof Error ? error.message : String(error))
    throw new Error(`esbuild failed:\n${details}`)
  }
  return outfile
}

/**
 * Cheap structural check before the bundle is allowed anywhere near a profile.
 * @param {string} bundlePath - built bundle path.
 * @returns {Promise<number>} bundle size in bytes.
 */
async function assertBuiltBundle(bundlePath) {
  const source = await readFile(bundlePath, 'utf8')
  if (
    !source.includes('subagent-claude-code')
    || !source.includes('persistNativeTranscript')
    || !source.includes('export {')
  ) {
    throw new Error('built bundle does not look like the patched provider; refusing to install')
  }
  return Buffer.byteLength(source)
}

/**
 * Syntax-check the built bundle during `--dry-run`.
 * @param {string} bundlePath - built bundle path.
 * @param {string} tempRoot - temp root that receives an ESM package.json marker.
 * @returns {Promise<void>}
 */
async function syntaxCheck(bundlePath, tempRoot) {
  await writeFile(join(tempRoot, 'package.json'), '{"type":"module"}\n')
  const result = spawnSync(process.execPath, ['--check', bundlePath], { encoding: 'utf8' })
  if (result.status !== 0) {
    const detail = (result.stderr || (result.error instanceof Error ? result.error.message : '')).trim()
    throw new Error(`built bundle failed syntax check${detail.length === 0 ? '' : `:\n${detail}`}`)
  }
}

/**
 * Print a dry-run plan for one target without writing to the profile.
 * @param {{ options: ReturnType<typeof parseArgs>, dshHome: string, target: { profile: string, providerDir: string, version: string }, bundleSize: number }} input - dry-run facts.
 * @returns {Promise<void>}
 */
async function printDryRun({ options, dshHome, target, bundleSize }) {
  const records = await listRecords(backupsRoot(dshHome), target.profile)
  const active = records.find(entry => (
    isMatchingActiveRecord(entry.record, options.tag)
    && entry.record.providerDir === target.providerDir
  ))
  console.log(`[dry-run] Profile:  ${target.profile}`)
  console.log(`[dry-run] Provider: ${PROVIDER_PACKAGE_NAME}@${target.version} (tag ${options.tag})`)
  console.log(`[dry-run] Built bundle OK (${bundleSize} bytes); syntax check passed`)
  console.log(`[dry-run] Would replace ${join(target.providerDir, 'lib', 'index.js')}`)
  console.log(`[dry-run] Would back up to ${backupProfileDir(dshHome, '<timestamp>', target.profile)}/index.js`)
  if (active !== undefined) {
    console.log(`[dry-run] Note: tag ${options.tag} already installed (${active.recordPath}); --force would be required`)
  }
  console.log(`[dry-run] Log dir: ${runLogDirectory(dshHome)}`)
}

/**
 * Back up and replace one profile's installed provider bundle, then verify it.
 * @param {{ options: ReturnType<typeof parseArgs>, dshHome: string, target: { profile: string, providerDir: string, version: string }, bundlePath: string }} input - install facts.
 * @returns {Promise<void>}
 */
async function installTarget({ options, dshHome, target, bundlePath }) {
  const records = await listRecords(backupsRoot(dshHome), target.profile)
  const active = records.find(entry => (
    isMatchingActiveRecord(entry.record, options.tag)
    && entry.record.providerDir === target.providerDir
  ))
  if (active !== undefined && !options.force) {
    throw new Error(
      `profile "${target.profile}": tag ${options.tag} is already installed `
      + `(record ${active.recordPath}); pass --force to reinstall`,
    )
  }
  if (active !== undefined) {
    console.warn(
      `WARNING: profile "${target.profile}": reinstalling tag ${options.tag} `
      + 'over an existing patch because --force was passed.',
    )
  }

  const indexPath = join(target.providerDir, 'lib', 'index.js')
  let indexStat
  try {
    indexStat = await stat(indexPath)
  } catch {
    throw new Error(
      `profile "${target.profile}": ${indexPath} does not exist; `
      + `is ${PROVIDER_PACKAGE_NAME} fully installed?`,
    )
  }
  if (!indexStat.isFile()) {
    throw new Error(`profile "${target.profile}": ${indexPath} is not a regular file`)
  }

  const timestamp = timestampDir()
  const backupDir = backupProfileDir(dshHome, timestamp, target.profile)
  const backupFile = join(backupDir, 'index.js')
  await mkdir(backupDir, { recursive: true })
  await copyFile(indexPath, backupFile)

  const record = {
    version: target.version,
    tag: options.tag,
    installedAt: new Date().toISOString(),
    providerDir: target.providerDir,
    backupFile,
  }
  const recordPath = join(backupDir, 'install.json')
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`)

  const originalMode = indexStat.mode & 0o777
  await chmod(backupFile, originalMode)
  await writeFile(indexPath, await readFile(bundlePath))
  await chmod(indexPath, 0o644)

  try {
    verifyInstalled(target.providerDir)
  } catch (error) {
    await copyFile(backupFile, indexPath)
    await chmod(indexPath, originalMode)
    throw new Error(
      `profile "${target.profile}": ${error instanceof Error ? error.message : String(error)}\n`
      + `Original lib/index.js restored from ${backupFile}`,
    )
  }

  console.log(`Profile:   ${target.profile}`)
  console.log(`Provider:  ${PROVIDER_PACKAGE_NAME}@${target.version} (tag ${options.tag})`)
  console.log(`Patched:   ${indexPath}`)
  console.log(`Backup:    ${backupFile}`)
  console.log(`Log dir:   ${runLogDirectory(dshHome)}`)
  console.log('Restart DSH to load the patched provider.')
}

/**
 * Verify the installed bundle in its real provider directory.
 * @param {string} providerDir - provider package real directory.
 * @returns {void}
 */
function verifyInstalled(providerDir) {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', VERIFY_SCRIPT],
    { cwd: providerDir, encoding: 'utf8', timeout: VERIFY_TIMEOUT_MS },
  )
  if (result.error !== undefined && result.error !== null) {
    throw new Error(`patch verification could not run: ${result.error.message}`)
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim()
    throw new Error(`patch verification failed${detail.length === 0 ? '' : `:\n${detail}`}`)
  }
}

/**
 * Restore the newest backup for one profile.
 * @param {{ options: ReturnType<typeof parseArgs>, dshHome: string, profile: string }} input - restore facts.
 * @returns {Promise<void>}
 */
async function restoreProfile({ options, dshHome, profile }) {
  const records = await listRecords(backupsRoot(dshHome), profile)
  if (records.length === 0) {
    throw new Error(
      `profile "${profile}": no patch backup records found under ${backupsRoot(dshHome)}`,
    )
  }
  const newest = records[0]
  const record = newest.record
  if (record.restoredAt !== undefined && record.restoredAt !== null) {
    console.log(`Profile ${profile}: already restored at ${record.restoredAt}; nothing to do.`)
    return
  }
  const indexPath = join(record.providerDir, 'lib', 'index.js')
  if (options.dryRun) {
    console.log(`[dry-run] Would restore ${record.backupFile} to ${indexPath}`)
    return
  }
  try {
    await stat(record.backupFile)
  } catch {
    throw new Error(
      `profile "${profile}": backup file ${record.backupFile} no longer exists`,
    )
  }
  try {
    await stat(record.providerDir)
  } catch {
    throw new Error(
      `profile "${profile}": provider directory ${record.providerDir} no longer exists; `
      + `restore the backup manually from ${record.backupFile}`,
    )
  }
  await mkdir(dirname(indexPath), { recursive: true })
  await copyFile(record.backupFile, indexPath)
  await chmod(indexPath, 0o644)

  record.restoredAt = new Date().toISOString()
  await writeFile(newest.recordPath, `${JSON.stringify(record, null, 2)}\n`)

  console.log(`Profile:   ${profile}`)
  console.log(`Restored:  ${indexPath}`)
  console.log(`From:      ${record.backupFile}`)
  console.log('Restart DSH to unload the patched provider.')
}

/**
 * List install records for one profile, newest first.
 * @param {string} root - backup root directory.
 * @param {string} profile - profile name.
 * @returns {Promise<Array<{ timestamp: string, recordPath: string, record: Record<string, any> }>>}
 */
async function listRecords(root, profile) {
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch {
    return []
  }
  const records = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const recordPath = join(root, entry.name, profile, 'install.json')
    try {
      const record = JSON.parse(await readFile(recordPath, 'utf8'))
      records.push({ timestamp: entry.name, recordPath, record })
    } catch {
      // A partial or unrelated timestamp directory carries no usable record.
    }
  }
  records.sort((left, right) => {
    if (left.timestamp === right.timestamp) return 0
    return left.timestamp < right.timestamp ? 1 : -1
  })
  return records
}

/** Print CLI usage. */
function printHelp() {
  console.log(`Usage: dsh-external-task-context-patch [options]

Options:
  --dsh-home <path>    DSH home (default: $DSH_HOME, else ~/.dsh)
  --profile <name>     Profile to patch; repeatable. Without it, every profile
                       with the provider installed is required to be unique
                       unless --yes is passed.
  --tag <git-tag>      deepseek-harness release tag (default: dsh-v0.2.2-rc.1)
  --source <dir>       Offline provider src directory with index.ts, run.ts,
                       and process.ts; skips the GitHub download
  --dry-run            Download, build, and verify without touching profiles
  --force              Install despite a version/tag mismatch or an existing
                       patch record for the same tag
  --restore            Restore the newest backup for the selected profile(s)
  --yes                Process all discovered profiles non-interactively
  -h, --help           Show this help
`)
}

try {
  await main(process.argv.slice(2))
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
