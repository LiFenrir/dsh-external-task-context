import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  backupProfileDir,
  backupsRoot,
  DEFAULT_TAG,
  discoverProfiles,
  isMatchingActiveRecord,
  parseArgs,
  PROVIDER_PACKAGE_NAME,
  providerDirFor,
  rawSourceUrl,
  resolveDshHome,
  runLogDirectory,
  tagToVersion,
  timestampDir,
  versionMatchesTag,
  versionToTag,
} from '../lib.mjs'

test('parseArgs applies defaults', () => {
  const options = parseArgs([])
  assert.equal(options.dshHome, undefined)
  assert.deepEqual(options.profiles, [])
  assert.equal(options.tag, DEFAULT_TAG)
  assert.equal(options.source, undefined)
  assert.equal(options.dryRun, false)
  assert.equal(options.force, false)
  assert.equal(options.restore, false)
  assert.equal(options.yes, false)
  assert.equal(options.help, false)
})

test('parseArgs reads values and repeatable profiles', () => {
  const options = parseArgs([
    '--dsh-home', '/srv/dsh',
    '--profile=desktop',
    '--profile', 'headless',
    '--tag', 'dsh-v0.2.2',
    '--source', 'checkout',
    '--dry-run',
    '--force',
    '--restore',
    '--yes',
  ])
  assert.equal(options.dshHome, '/srv/dsh')
  assert.deepEqual(options.profiles, ['desktop', 'headless'])
  assert.equal(options.tag, 'dsh-v0.2.2')
  assert.equal(options.source, 'checkout')
  assert.equal(options.dryRun, true)
  assert.equal(options.force, true)
  assert.equal(options.restore, true)
  assert.equal(options.yes, true)
})

test('parseArgs rejects unknown options and missing values', () => {
  assert.throws(() => parseArgs(['--bogus']), /unknown option/)
  assert.throws(() => parseArgs(['--tag']), /missing value/)
  assert.throws(() => parseArgs(['--profile', '']), /empty value/)
})

test('parseArgs rejects profile names that escape the profiles directory', () => {
  assert.throws(() => parseArgs(['--profile', '..']), /invalid profile name/)
  assert.throws(() => parseArgs(['--profile', 'a/b']), /invalid profile name/)
  assert.throws(() => parseArgs(['--profile', 'a\\b']), /invalid profile name/)
})

test('resolveDshHome prefers the flag, then $DSH_HOME, then ~/.dsh', () => {
  const env = { DSH_HOME: ' /env/dsh ' }
  assert.equal(resolveDshHome('/flag/dsh', env, '/home/user'), '/flag/dsh')
  assert.equal(resolveDshHome(undefined, env, '/home/user'), '/env/dsh')
  assert.equal(resolveDshHome(undefined, { DSH_HOME: '   ' }, '/home/user'), '/home/user/.dsh')
  assert.equal(resolveDshHome(undefined, {}, '/home/user'), '/home/user/.dsh')
})

test('version and tag map both ways', () => {
  assert.equal(versionToTag('0.2.2-rc.1'), 'dsh-v0.2.2-rc.1')
  assert.equal(tagToVersion('dsh-v0.2.2-rc.1'), '0.2.2-rc.1')
  assert.equal(versionMatchesTag('0.2.2-rc.1', 'dsh-v0.2.2-rc.1'), true)
  assert.equal(versionMatchesTag('0.2.2', 'dsh-v0.2.2-rc.1'), false)
  assert.throws(() => tagToVersion('v0.2.2-rc.1'), /invalid DSH release tag/)
  assert.throws(() => versionToTag(''), /empty/)
})

test('timestampDir produces a path-safe UTC stamp', () => {
  const stamp = timestampDir(new Date('2026-11-06T14:07:00.123Z'))
  assert.equal(stamp, '2026-11-06T14-07-00-123Z')
  assert.equal(stamp.includes(':'), false)
  assert.equal(stamp.includes('.'), false)
})

test('rawSourceUrl addresses the official provider sources', () => {
  assert.equal(
    rawSourceUrl('dsh-v0.2.2-rc.1', 'index.ts'),
    'https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/dsh-v0.2.2-rc.1/packages/subagent/subagent-claude-code/src/index.ts',
  )
})

test('path helpers compose the expected locations', () => {
  const dshHome = '/srv/dsh'
  assert.equal(
    providerDirFor('/srv/dsh/profiles/desktop'),
    `/srv/dsh/profiles/desktop/node_modules/${PROVIDER_PACKAGE_NAME}`,
  )
  assert.equal(backupsRoot(dshHome), '/srv/dsh/backups/subagent-claude-code-patch')
  assert.equal(
    backupProfileDir(dshHome, '2026-11-06T14-07-00-123Z', 'desktop'),
    '/srv/dsh/backups/subagent-claude-code-patch/2026-11-06T14-07-00-123Z/desktop',
  )
  assert.equal(runLogDirectory(dshHome), '/srv/dsh/logs/subagent-claude-code')
})

test('isMatchingActiveRecord matches unrestored records for the same tag', () => {
  assert.equal(isMatchingActiveRecord({ tag: 'dsh-v0.2.2-rc.1' }, 'dsh-v0.2.2-rc.1'), true)
  assert.equal(isMatchingActiveRecord({ tag: 'dsh-v0.2.2-rc.1', restoredAt: '2026-11-06T00:00:00.000Z' }, 'dsh-v0.2.2-rc.1'), false)
  assert.equal(isMatchingActiveRecord({ tag: 'dsh-v0.2.1' }, 'dsh-v0.2.2-rc.1'), false)
  assert.equal(isMatchingActiveRecord(undefined, 'dsh-v0.2.2-rc.1'), false)
})

test('discoverProfiles finds profiles with the provider installed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-patch-test-'))
  try {
    const profilesRoot = join(root, 'profiles')
    await mkdir(join(profilesRoot, 'desktop', 'node_modules', ...PROVIDER_PACKAGE_NAME.split('/')), { recursive: true })
    await mkdir(join(profilesRoot, 'other', 'node_modules'), { recursive: true })
    // A symlinked installation, as pnpm creates it, must also be discovered.
    const target = join(root, 'store-provider')
    await mkdir(target, { recursive: true })
    const headlessModules = join(profilesRoot, 'headless', 'node_modules')
    await mkdir(headlessModules, { recursive: true })
    const scoped = join(headlessModules, '@deepseek-ai')
    await mkdir(scoped, { recursive: true })
    await symlink(target, join(scoped, 'dsh-subagent-claude-code'))

    assert.deepEqual(await discoverProfiles(root), ['desktop', 'headless'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('discoverProfiles returns an empty list when there are no profiles', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-patch-test-'))
  try {
    assert.deepEqual(await discoverProfiles(root), [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
