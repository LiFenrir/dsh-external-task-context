/**
 * Helper functions for the patch installer: argument parsing, version/tag
 * mapping, DSH home resolution, profile discovery, and install-record checks.
 * These helpers are free of installer side effects so they can be unit tested.
 *
 * @module dsh-external-task-context-patch/lib
 */

import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

/** npm name of the provider package this patch targets. */
export const PROVIDER_PACKAGE_NAME = '@deepseek-ai/dsh-subagent-claude-code'

/** git tag used when the caller does not pass `--tag`. */
export const DEFAULT_TAG = 'dsh-v0.2.2-rc.1'

/** Official provider source files fetched or read from `--source`. */
export const PROVIDER_SRC_FILES = ['index.ts', 'run.ts', 'process.ts']

/** Patched source files copied from this package's `src/` directory. */
export const PATCHED_SRC_FILES = ['index.ts', 'run.ts', 'log.ts']

/** Directory name under `<DSH_HOME>/backups` that owns all patch records. */
export const BACKUP_DIR_NAME = 'subagent-claude-code-patch'

/** Relative path of the run-log directory created by the patched provider. */
export const RUN_LOG_RELATIVE_PATH = ['logs', 'subagent-claude-code']

const VALUE_OPTIONS = new Set(['--dsh-home', '--profile', '--tag', '--source'])
const FLAG_OPTIONS = new Set(['--dry-run', '--force', '--restore', '--yes', '--help', '-h'])

/**
 * Parse installer CLI arguments.
 * @param {readonly string[]} argv - process arguments without the executable and script.
 * @returns {{ dshHome: string | undefined, profiles: string[], tag: string, source: string | undefined, dryRun: boolean, force: boolean, restore: boolean, yes: boolean, help: boolean }}
 * @throws {Error} on an unknown option, a missing value, or an invalid profile name.
 */
export function parseArgs(argv) {
  const options = {
    dshHome: undefined,
    profiles: [],
    tag: DEFAULT_TAG,
    source: undefined,
    dryRun: false,
    force: false,
    restore: false,
    yes: false,
    help: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (FLAG_OPTIONS.has(argument)) {
      switch (argument) {
        case '--dry-run': options.dryRun = true; break
        case '--force': options.force = true; break
        case '--restore': options.restore = true; break
        case '--yes': options.yes = true; break
        default: options.help = true
      }
      continue
    }

    let name = argument
    let value
    const equals = argument.indexOf('=')
    if (argument.startsWith('--') && equals !== -1) {
      name = argument.slice(0, equals)
      value = argument.slice(equals + 1)
    }
    if (!VALUE_OPTIONS.has(name)) {
      throw new Error(`unknown option: ${argument}`)
    }
    if (value === undefined) {
      index += 1
      value = argv[index]
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`missing value for ${name}`)
      }
    }
    if (value.trim().length === 0) {
      throw new Error(`empty value for ${name}`)
    }
    switch (name) {
      case '--dsh-home': options.dshHome = value; break
      case '--profile': options.profiles.push(assertProfileName(value)); break
      case '--tag': options.tag = value; break
      case '--source': options.source = value; break
      default: throw new Error(`unknown option: ${name}`)
    }
  }
  return options
}

/**
 * Reject profile names that could escape `<DSH_HOME>/profiles`.
 * @param {string} name - profile directory name.
 * @returns {string} the unchanged name when valid.
 */
export function assertProfileName(name) {
  if (
    name.length === 0
    || name === '.'
    || name === '..'
    || name.includes('/')
    || name.includes('\\')
  ) {
    throw new Error(`invalid profile name: ${name}`)
  }
  return name
}

/**
 * Resolve the DeepSeek Harness home directory.
 * @param {string | undefined} explicit - `--dsh-home` value, when supplied.
 * @param {NodeJS.ProcessEnv} [env] - environment source.
 * @param {string} [home] - operating-system home directory.
 * @returns {string} absolute DSH home path.
 * @throws {Error} when an explicit `--dsh-home` is blank.
 */
export function resolveDshHome(explicit, env = process.env, home = homedir()) {
  if (explicit !== undefined) {
    if (explicit.trim().length === 0) {
      throw new Error('--dsh-home must not be empty')
    }
    return resolve(explicit.trim())
  }
  const configured = env.DSH_HOME
  if (configured !== undefined && configured.trim().length > 0) {
    return resolve(configured.trim())
  }
  return join(home, '.dsh')
}

/**
 * Map a provider package version to its deepseek-harness git tag.
 * @param {string} version - package version, for example `0.2.2-rc.1`.
 * @returns {string} tag, for example `dsh-v0.2.2-rc.1`.
 */
export function versionToTag(version) {
  if (typeof version !== 'string' || version.trim().length === 0) {
    throw new Error('provider version is empty')
  }
  return `dsh-v${version.trim()}`
}

/**
 * Map a deepseek-harness git tag to the provider package version.
 * @param {string} tag - tag, for example `dsh-v0.2.2-rc.1`.
 * @returns {string} version, for example `0.2.2-rc.1`.
 */
export function tagToVersion(tag) {
  if (typeof tag !== 'string' || !tag.startsWith('dsh-v') || tag.length === 5) {
    throw new Error(`invalid DSH release tag: ${String(tag)}`)
  }
  return tag.slice(5)
}

/**
 * Whether an installed provider version matches the requested tag.
 * @param {string} version - installed package version.
 * @param {string} tag - requested git tag.
 * @returns {boolean} true when both name the same release.
 */
export function versionMatchesTag(version, tag) {
  return version === tagToVersion(tag)
}

/**
 * Directory holding one profile's installed provider package.
 * @param {string} profileDir - absolute profile directory.
 * @returns {string} absolute provider package directory.
 */
export function providerDirFor(profileDir) {
  return join(profileDir, 'node_modules', ...PROVIDER_PACKAGE_NAME.split('/'))
}

/**
 * List profiles that have the target provider installed.
 * @param {string} dshHome - absolute DSH home.
 * @param {{ readdir?: typeof readdir, exists?: (path: string) => boolean }} [io] - injection points for tests.
 * @returns {Promise<string[]>} matching profile names, sorted.
 */
export async function discoverProfiles(dshHome, io = {}) {
  const readdirImpl = io.readdir ?? readdir
  const existsImpl = io.exists ?? existsSync
  const profilesRoot = join(dshHome, 'profiles')
  let entries
  try {
    entries = await readdirImpl(profilesRoot, { withFileTypes: true })
  } catch {
    return []
  }
  const matches = []
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
    if (existsImpl(providerDirFor(join(profilesRoot, entry.name)))) {
      matches.push(entry.name)
    }
  }
  return matches.sort()
}

/**
 * Render a filesystem-safe UTC timestamp used as a backup directory name.
 * @param {Date} [date] - instant to render.
 * @returns {string} timestamp such as `2026-11-06T14-07-00-000Z`.
 */
export function timestampDir(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-')
}

/**
 * Build the GitHub raw URL for one official provider source file.
 * @param {string} tag - release tag.
 * @param {string} file - source file name.
 * @returns {string} raw.githubusercontent.com URL.
 */
export function rawSourceUrl(tag, file) {
  const path = [
    'deepseek-ai',
    'deepseek-harness',
    tag,
    'packages',
    'subagent',
    'subagent-claude-code',
    'src',
    file,
  ].map(part => encodeURIComponent(part)).join('/')
  return `https://raw.githubusercontent.com/${path}`
}

/**
 * Root directory that owns timestamped backup sets.
 * @param {string} dshHome - absolute DSH home.
 * @returns {string} absolute backup root.
 */
export function backupsRoot(dshHome) {
  return join(dshHome, 'backups', BACKUP_DIR_NAME)
}

/**
 * Backup directory for one profile inside a timestamped set.
 * @param {string} dshHome - absolute DSH home.
 * @param {string} timestamp - output of {@link timestampDir}.
 * @param {string} profile - profile name.
 * @returns {string} absolute backup directory.
 */
export function backupProfileDir(dshHome, timestamp, profile) {
  return join(backupsRoot(dshHome), timestamp, assertProfileName(profile))
}

/**
 * Run-log directory reported by the patched provider.
 * @param {string} dshHome - absolute DSH home.
 * @returns {string} absolute log directory.
 */
export function runLogDirectory(dshHome) {
  return join(dshHome, ...RUN_LOG_RELATIVE_PATH)
}

/**
 * Whether an install record represents an active patch for the given tag.
 * @param {{ tag?: string, restoredAt?: string } | undefined} record - install record.
 * @param {string} tag - requested tag.
 * @returns {boolean} true when the record is unrestored and names the same tag.
 */
export function isMatchingActiveRecord(record, tag) {
  return record !== undefined
    && record.tag === tag
    && (record.restoredAt === undefined || record.restoredAt === null)
}
