import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = path.resolve(__dirname, '..', '..')

export function defaultSchemaPath() {
  return path.join(PKG_ROOT, 'schema', 'manifest.schema.json')
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  try {
    return JSON.parse(raw)
  } catch (e) {
    throw new Error(`Invalid JSON: ${filePath} — ${e.message}`)
  }
}

export function validateManifestData(data, manifestPath, schemaPath) {
  if (!data || typeof data !== 'object') {
    throw new Error(`Root must be an object: ${manifestPath}`)
  }
  if (!data.id || typeof data.id !== 'string' || !data.id.trim()) {
    throw new Error(`Missing or empty required field "id": ${manifestPath}`)
  }
  if (!data.entry || typeof data.entry !== 'string' || !data.entry.trim()) {
    throw new Error(`Missing or empty required field "entry": ${manifestPath}`)
  }
  if (data.priority != null && typeof data.priority !== 'number') {
    console.warn(`[web-fp-kit] Warning: "priority" should be a number: ${manifestPath}`)
  }
  if (data.styles != null && !Array.isArray(data.styles)) {
    throw new Error(`"styles" must be an array of strings: ${manifestPath}`)
  }
  if (schemaPath && fs.existsSync(schemaPath)) {
    const schema = readJson(schemaPath)
    const req = schema.required || []
    for (const key of req) {
      if (data[key] === undefined || data[key] === null || data[key] === '') {
        throw new Error(`Schema required property missing "${key}": ${manifestPath}`)
      }
    }
  }
}

/**
 * @param {string} manifestPath absolute or relative path
 * @param {string} [schemaPath] defaults to bundled schema
 */
export function validateManifestFile(manifestPath, schemaPath) {
  const abs = path.resolve(manifestPath)
  if (!fs.existsSync(abs)) {
    throw new Error(`File not found: ${abs}`)
  }
  const data = readJson(abs)
  const schema = schemaPath || defaultSchemaPath()
  validateManifestData(data, abs, fs.existsSync(schema) ? schema : null)
  return abs
}

/**
 * @param {string[]} manifestPaths
 * @param {{ schemaPath?: string }} [opts]
 */
export function validateManifestFiles(manifestPaths, opts = {}) {
  const schema = opts.schemaPath || defaultSchemaPath()
  const useSchema = fs.existsSync(schema) ? schema : null
  if (!useSchema) {
    console.warn(`[web-fp-kit] Schema not found at ${schema}, using minimal checks only`)
  }
  for (const f of manifestPaths) {
    const abs = validateManifestFile(f, useSchema)
    console.log(`[web-fp-kit] validate OK ${abs}`)
  }
}
