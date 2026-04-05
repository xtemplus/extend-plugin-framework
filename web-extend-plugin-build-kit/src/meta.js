import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(fs.readFileSync(path.join(dir, '..', 'package.json'), 'utf8'))

/** 与当前安装的 npm 包版本一致（供日志或宿主探测） */
export const presetVersion = pkg.version
