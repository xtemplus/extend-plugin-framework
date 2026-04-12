import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { presetVersion } from '../meta.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = path.resolve(__dirname, '..', '..')
const TEMPLATES_ROOT = path.join(PKG_ROOT, 'templates')
const DEFAULT_TEMPLATE = 'vite-vue2-minimal'
const PLUGIN_ID_RE = /^[a-zA-Z0-9]+(?:[._-][a-zA-Z0-9]+)*$/

export function createPluginTemplate(options = {}) {
  const normalized = normalizeCreateOptions(options)
  ensureTemplateExists(normalized.template)
  ensureTargetDir(normalized.targetDir, normalized.force)

  const templateRoot = path.join(TEMPLATES_ROOT, normalized.template)
  const createdFiles = []

  copyTemplateDir(templateRoot, normalized.targetDir, normalized.variables, createdFiles)

  return {
    targetDir: normalized.targetDir,
    template: normalized.template,
    files: createdFiles,
    derived: normalized.derived
  }
}

function normalizeCreateOptions(options) {
  const projectName = String(options.projectName || '').trim()
  if (!projectName) {
    throw new Error('create: <project-name> is required')
  }

  const template = String(options.template || DEFAULT_TEMPLATE).trim() || DEFAULT_TEMPLATE
  const force = Boolean(options.force)
  const targetDir = path.resolve(options.targetDir || projectName)
  const slug = toSlug(projectName)
  if (!slug) {
    throw new Error(`create: invalid project name "${projectName}"`)
  }

  const pluginId = String(options.pluginId || `com.example.frontend.${slug}`).trim()
  if (!PLUGIN_ID_RE.test(pluginId)) {
    throw new Error(`create: invalid --plugin-id "${pluginId}"`)
  }

  const pluginName = String(options.pluginName || `${toTitle(projectName)} Plugin`).trim()
  const libName = String(options.libName || `${toPascal(projectName)}Plugin`).trim()
  const packageName = String(options.packageName || `web-plugin-${slug}`).trim()
  const routeBase = slug

  const devPortRaw = options.devPort ?? 5188
  const devPort = Number(devPortRaw)
  if (!Number.isInteger(devPort) || devPort < 1 || devPort > 65535) {
    throw new Error(`create: invalid --dev-port "${devPortRaw}"`)
  }

  return {
    projectName,
    template,
    force,
    targetDir,
    derived: {
      packageName,
      pluginId,
      pluginName,
      libName,
      devPort
    },
    variables: {
      projectName,
      packageName,
      pluginId,
      pluginName,
      libName,
      devPort: String(devPort),
      buildKitVersion: `^${presetVersion}`,
      routeBase,
      routeNameBase: slug.replace(/-/g, '-')
    }
  }
}

function ensureTemplateExists(template) {
  const templateRoot = path.join(TEMPLATES_ROOT, template)
  if (!fs.existsSync(templateRoot)) {
    throw new Error(`create: unknown template "${template}"`)
  }
}

function ensureTargetDir(targetDir, force) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
    return
  }

  const entries = fs.readdirSync(targetDir)
  if (entries.length === 0 && force) {
    return
  }
  if (entries.length === 0) {
    return
  }
  throw new Error(`create: target directory is not empty: ${targetDir}`)
}

function copyTemplateDir(srcDir, destDir, variables, createdFiles) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name)
    const outputName = mapTemplateName(entry.name)
    const destPath = path.join(destDir, outputName)

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true })
      copyTemplateDir(srcPath, destPath, variables, createdFiles)
      continue
    }

    const content = fs.readFileSync(srcPath, 'utf8')
    const finalContent = entry.name.endsWith('.tpl') ? renderTemplate(content, variables) : content
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.writeFileSync(destPath, finalContent, 'utf8')
    createdFiles.push(destPath)
  }
}

function mapTemplateName(name) {
  if (name === '_gitignore') {
    return '.gitignore'
  }
  if (name.endsWith('.tpl')) {
    return name.slice(0, -4)
  }
  return name
}

function renderTemplate(content, variables) {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in variables)) {
      throw new Error(`create: missing template variable "${key}"`)
    }
    return String(variables[key])
  })
}

function toSlug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toTitle(value) {
  return String(value)
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function toPascal(value) {
  return String(value)
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}
