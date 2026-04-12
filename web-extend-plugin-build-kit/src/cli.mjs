#!/usr/bin/env node
import { validateManifestFiles, defaultSchemaPath } from './lib/validate-manifest.js'
import { packPluginBundle, printPackResult } from './lib/pack.js'
import { createPluginTemplate } from './lib/create.js'

function printHelp() {
  console.log(`
web-ext-kit - web-extend-plugin-build-kit CLI

Usage:
  web-ext-kit create <project-name> [--template <name>] [--plugin-id <id>] [--plugin-name <name>]
                     [--lib-name <name>] [--dev-port <port>] [--target-dir <dir>] [--force]
  web-ext-kit validate [manifest.json ...] [--schema path/to/schema.json]
  web-ext-kit pack [--cwd <dir>] [--clean]   (run from plugin root; expects manifest.json + dist/)

Options:
  --schema   Override JSON Schema (default: bundled manifest.schema.json)
  --cwd      Plugin project root for pack (default: current directory)
  --clean    Remove source dist/ after pack finishes
`)
}

const argv = process.argv.slice(2)
const cmd = argv[0]

if (!cmd || cmd === '-h' || cmd === '--help') {
  printHelp()
  process.exit(cmd ? 0 : 1)
}

if (cmd === 'validate') {
  let schemaPath
  const files = []
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--schema' && argv[i + 1]) {
      schemaPath = argv[++i]
      continue
    }
    if (!argv[i].startsWith('--')) {
      files.push(argv[i])
    }
  }
  if (files.length === 0) {
    console.error('[web-ext-kit] validate: pass at least one manifest.json path')
    process.exit(1)
  }
  try {
    validateManifestFiles(files, { schemaPath: schemaPath || defaultSchemaPath() })
  } catch (e) {
    console.error('[web-ext-kit]', e.message || e)
    process.exit(1)
  }
  process.exit(0)
}

if (cmd === 'create') {
  const projectName = argv[1]
  if (!projectName || projectName.startsWith('--')) {
    console.error('[web-ext-kit] create: <project-name> is required')
    process.exit(1)
  }

  try {
    const result = createPluginTemplate({
      projectName,
      template: readOption(argv, '--template'),
      pluginId: readOption(argv, '--plugin-id'),
      pluginName: readOption(argv, '--plugin-name'),
      libName: readOption(argv, '--lib-name'),
      devPort: readOption(argv, '--dev-port'),
      targetDir: readOption(argv, '--target-dir'),
      force: argv.includes('--force')
    })
    console.log('[web-ext-kit] created project at', result.targetDir)
    console.log('[web-ext-kit] next:')
    console.log('  cd', result.targetDir)
    console.log('  npm install')
    console.log('  npm run dev')
    process.exit(0)
  } catch (e) {
    console.error('[web-ext-kit]', e.message || e)
    process.exit(1)
  }
}

if (cmd === 'pack') {
  let cwd = process.cwd()
  const cwdIdx = argv.indexOf('--cwd')
  if (cwdIdx >= 0 && argv[cwdIdx + 1]) {
    cwd = argv[cwdIdx + 1]
  }
  try {
    const result = packPluginBundle(cwd, { cleanSourceDist: argv.includes('--clean') })
    printPackResult(result)
  } catch (e) {
    console.error('[web-ext-kit]', e.message || e)
    process.exit(1)
  }
  process.exit(0)
}

console.error('[web-ext-kit] unknown command:', cmd)
printHelp()
process.exit(1)

function readOption(argv, name) {
  const idx = argv.indexOf(name)
  if (idx >= 0 && argv[idx + 1] && !argv[idx + 1].startsWith('--')) {
    return argv[idx + 1]
  }
  return undefined
}
