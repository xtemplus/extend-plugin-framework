import fs from 'fs'
import path from 'path'

/**
 * Copy manifest.json + dist/ → dist-pack/<manifest.id>/ under root.
 * @param {string} [rootDir] plugin project root (default process.cwd())
 * @param {{ outDir?: string }} [opts] outDir default 'dist-pack'
 */
export function packPluginBundle(rootDir = process.cwd(), opts = {}) {
  const root = path.resolve(rootDir)
  const manifestPath = path.join(root, 'manifest.json')

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.json not found in ${root}`)
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const bundleDir = manifest.id
  if (!bundleDir || typeof bundleDir !== 'string') {
    throw new Error('manifest.id is required')
  }

  const distSrc = path.join(root, 'dist')
  if (!fs.existsSync(distSrc)) {
    throw new Error('dist/ missing — run production build first (e.g. vite build / webpack build)')
  }

  const entryRel = manifest.entry || ''
  const entryFile = path.join(root, entryRel.replace(/\//g, path.sep))
  if (!fs.existsSync(entryFile)) {
    throw new Error(`entry file not found: ${entryFile}`)
  }

  const outRootName = opts.outDir || 'dist-pack'
  const outRoot = path.join(root, outRootName)
  const outDir = path.join(outRoot, bundleDir)
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })

  fs.copyFileSync(manifestPath, path.join(outDir, 'manifest.json'))
  fs.cpSync(distSrc, path.join(outDir, 'dist'), { recursive: true })

  return { outDir, bundleDir, outRoot }
}

export function printPackResult(result) {
  console.log('[web-fp-kit] packed to', result.outDir)
  console.log('[web-fp-kit] deploy: copy folder to host plugins/web/' + result.bundleDir + '/')
}
