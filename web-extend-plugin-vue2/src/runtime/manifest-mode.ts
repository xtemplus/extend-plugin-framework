/**
 * 清单模式与静态清单 URL 配置解析（显式 options + VITE_* / PLUGIN_* 环境）。
 */
import { resolveBundledEnv } from './env-resolve'

export function resolveManifestModeFromInputs(userMode: unknown): 'api' | 'static' {
  if (userMode !== undefined && userMode !== null && String(userMode).trim() !== '') {
    const s = String(userMode).trim().toLowerCase()
    if (s === 'static' || s === 'api') {
      return s
    }
  }
  const e = resolveBundledEnv('VITE_WEB_PLUGIN_MANIFEST_MODE', '')
  if (e) {
    const s = String(e).trim().toLowerCase()
    if (s === 'static' || s === 'api') {
      return s
    }
  }
  return 'api'
}

export function resolveStaticManifestUrlFromInputs(userUrl: unknown): string {
  if (userUrl !== undefined && userUrl !== null) {
    const s = String(userUrl).trim()
    if (s !== '') {
      return s
    }
  }
  return String(resolveBundledEnv('VITE_WEB_PLUGIN_STATIC_MANIFEST_URL', '') || '').trim()
}
