#!/usr/bin/env node
import { validateManifestFiles, defaultSchemaPath } from './lib/validate-manifest.js'
import { packPluginBundle, printPackResult } from './lib/pack.js'

function printHelp() {
  console.log(`
web-fp-kit — web-extend-plugin-build-kit CLI

Usage:
  web-fp-kit validate [manifest.json ...] [--schema path/to/schema.json]
  web-fp-kit pack [--cwd <dir>]   (run from plugin root; expects manifest.json + dist/)

Options:
  --schema   Override JSON Schema (default: bundled manifest.schema.json)
  --cwd      Plugin project root for pack (default: current directory)
`)
}

const argv = process.argv.slice(2)
const cmd = argv[0]

if (!cmd || cmd === '-h' || cmd === '--help') {
  printHelp()
  process.exit(cmd ? 0 : 1)
}

if (cmd === 'validate') {
  const schemaIdx = argv.indexOf('--schema')
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
    console.error('[web-fp-kit] validate: pass at least one manifest.json path')
    process.exit(1)
  }
  try {
    validateManifestFiles(files, { schemaPath: schemaPath || defaultSchemaPath() })
  } catch (e) {
    console.error('[web-fp-kit]', e.message || e)
    process.exit(1)
  }
  process.exit(0)
}

if (cmd === 'pack') {
  let cwd = process.cwd()
  const cwdIdx = argv.indexOf('--cwd')
  if (cwdIdx >= 0 && argv[cwdIdx + 1]) {
    cwd = argv[cwdIdx + 1]
  }
  try {
    const result = packPluginBundle(cwd)
    printPackResult(result)
  } catch (e) {
    console.error('[web-fp-kit]', e.message || e)
    process.exit(1)
  }
  process.exit(0)
}

console.error('[web-fp-kit] unknown command:', cmd)
printHelp()
process.exit(1)
