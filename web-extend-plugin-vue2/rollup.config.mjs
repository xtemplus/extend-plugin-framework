import { readFileSync } from 'node:fs'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// Bundle semver: Webpack 4 + Vue CLI 4 treat semver as CJS and break on `import { x } from 'semver'` in our ESM entry.
const external = [
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.dependencies || {}).filter((name) => name !== 'semver')
]

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/index.cjs',
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
      interop: 'auto'
    },
    {
      file: 'dist/index.mjs',
      format: 'es',
      exports: 'named',
      sourcemap: true
    }
  ],
  external,
  plugins: [nodeResolve(), commonjs()]
}
