/**
 * 清单模式与静态清单 URL 配置解析（显式 options + VITE_* / PLUGIN_* 环境）。
 */
import { defaultManifestMode, webExtendPluginEnvKeys } from '../core/public-config-defaults'
import { resolveBundledEnv } from './env-resolve'

const EK = webExtendPluginEnvKeys

export function resolveManifestModeFromInputs(userMode: unknown): 'api' | 'static' {
  if (userMode !== undefined && userMode !== null && String(userMode).trim() !== '') {
    const s = String(userMode).trim().toLowerCase()
    if (s === 'static' || s === 'api') {
      return s
    }
  }
  const e = resolveBundledEnv(EK.manifestMode, '')
  if (e) {
    const s = String(e).trim().toLowerCase()
    if (s === 'static' || s === 'api') {
      return s
    }
  }
  return defaultManifestMode
}

export function resolveStaticManifestUrlFromInputs(userUrl: unknown): string {
  if (userUrl !== undefined && userUrl !== null) {
    const s = String(userUrl).trim()
    if (s !== '') {
      return s
    }
  }
  return String(resolveBundledEnv(EK.staticManifestUrl, '') || '').trim()
}
