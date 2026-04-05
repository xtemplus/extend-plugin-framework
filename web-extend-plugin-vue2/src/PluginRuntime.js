/**
 * 宿主侧插件引导：拉取清单、dev 映射、加载入口脚本、调用 activator。
 * 路径与白名单等默认值见 `defaultWebExtendPluginRuntime`，可通过 `resolveRuntimeOptions` / 环境变量覆盖。
 *
 * **Webpack 宿主**：无 `import.meta.env` 时，用 `DefinePlugin` 注入 `process.env.VITE_*` 或 **`PLUGIN_*`**（等价键）或传入第三参。
 *
 * @module PluginRuntime
 */
import { coerce, satisfies } from 'semver'
import { HOST_PLUGIN_API_VERSION } from './constants.js'
import { defaultWebExtendPluginRuntime } from './default-runtime-config.js'

const DEF = defaultWebExtendPluginRuntime

/**
 * @typedef {object} WebExtendPluginRuntimeOptions
 * @property {string} [manifestBase] 清单服务 URL 前缀
 * @property {string} [manifestListPath] 清单接口路径（以 `/` 开头），拼在 manifestBase 后
 * @property {RequestCredentials} [manifestFetchCredentials] 清单 fetch 的 credentials
 * @property {boolean} [isDev] 开发模式
 * @property {string} [webPluginDevOrigin] 插件 dev origin
 * @property {string} [webPluginDevIds] 逗号分隔 id，隐式 dev 映射
 * @property {string} [webPluginDevMapJson] 显式 dev 映射 JSON
 * @property {string} [webPluginDevEntryPath] 隐式 dev 入口路径（相对插件 dev origin）
 * @property {string} [devPingPath] dev 存活探测路径
 * @property {string} [devReloadSsePath] dev 热更新 SSE 路径
 * @property {number} [devPingTimeoutMs] 探测超时
 * @property {string[]} [defaultImplicitDevPluginIds] 无 `webPluginDevIds`/env 时用于隐式 dev 的 id；包内默认 `[]`
 * @property {string[]} [allowedScriptHosts] 允许加载脚本的主机名
 * @property {string[]} [bridgeAllowedPathPrefixes] bridge.request 白名单前缀
 * @property {boolean} [bootstrapSummary] bootstrap 结束是否打印摘要
 */

/**
 * 从 Vite 注入的 `import.meta.env` 读取字符串配置。
 * @param {string} key
 * @returns {string|undefined}
 */
function readImportMetaEnv(key) {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const v = import.meta.env[key]
      if (v !== undefined && v !== '') {
        return String(v)
      }
    }
  } catch (_) {}
  return undefined
}

/**
 * 从 Webpack `DefinePlugin` 等注入的 `process.env` 读取。
 * @param {string} key
 * @returns {string|undefined}
 */
function readProcessEnv(key) {
  try {
    if (typeof process !== 'undefined' && process.env && key in process.env) {
      const v = process.env[key]
      if (v !== undefined && v !== '') {
        return String(v)
      }
    }
  } catch (_) {}
  return undefined
}

/**
 * `VITE_*` 的并列命名：同值可读 `PLUGIN_*`（`VITE_WEB_PLUGIN_X` → `PLUGIN_WEB_PLUGIN_X`）。
 * Vite 需在 `defineConfig({ envPrefix: ['VITE_', 'PLUGIN_'] })` 中暴露 `PLUGIN_`；Webpack 用 DefinePlugin 注入即可。
 * @param {string} viteStyleKey 以 `VITE_` 开头的键名
 * @returns {string|null}
 */
function viteKeyToPluginAlternate(viteStyleKey) {
  if (typeof viteStyleKey !== 'string' || !viteStyleKey.startsWith('VITE_')) {
    return null
  }
  return `PLUGIN_${viteStyleKey.slice(5)}`
}

/**
 * 先读 `VITE_*`，再读对应的 `PLUGIN_*`，再 `process.env`，最后 `fallback`。
 * @param {string} key 仍以 `VITE_*` 为逻辑名（与文档一致）
 * @param {string} [fallback='']
 */
function resolveBundledEnv(key, fallback = '') {
  const alt = viteKeyToPluginAlternate(key)
  const fromMeta =
    readImportMetaEnv(key) ?? (alt ? readImportMetaEnv(alt) : undefined)
  const fromProcess =
    readProcessEnv(key) ?? (alt ? readProcessEnv(alt) : undefined)
  return fromMeta ?? fromProcess ?? fallback
}

/**
 * @returns {boolean}
 */
function resolveBundledIsDev() {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV === true) {
      return true
    }
  } catch (_) {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
      return true
    }
  } catch (_) {}
  return false
}

/**
 * @param {string} p
 */
function ensureLeadingPath(p) {
  const t = String(p || '').trim()
  if (!t) {
    return '/'
  }
  return t.startsWith('/') ? t : `/${t}`
}

/**
 * 解析 `include` | `omit` | `same-origin`，非法时回退默认值。
 * @param {string|undefined} userVal
 * @param {string} envKey
 * @param {RequestCredentials} fallback
 */
function resolveManifestCredentials(userVal, envKey, fallback) {
  if (userVal !== undefined && userVal !== '') {
    const s = String(userVal)
    if (s === 'include' || s === 'omit' || s === 'same-origin') {
      return s
    }
  }
  const e = resolveBundledEnv(envKey, '')
  if (e === 'include' || e === 'omit' || e === 'same-origin') {
    return e
  }
  return fallback
}

/**
 * @param {number|undefined} userVal
 * @param {string} envKey
 * @param {number} fallback
 */
function resolvePositiveInt(userVal, envKey, fallback) {
  if (typeof userVal === 'number' && Number.isFinite(userVal) && userVal > 0) {
    return Math.floor(userVal)
  }
  const raw = resolveBundledEnv(envKey, '')
  const n = raw ? parseInt(raw, 10) : NaN
  if (Number.isFinite(n) && n > 0) {
    return n
  }
  return fallback
}

/**
 * 合并用户、环境变量与 `defaultWebExtendPluginRuntime`，得到完整运行时选项（宿主可只传需要覆盖的字段）。
 * @param {WebExtendPluginRuntimeOptions} [user]
 * @returns {object}
 */
export function resolveRuntimeOptions(user = {}) {
  const manifestBaseRaw =
    user.manifestBase !== undefined && user.manifestBase !== ''
      ? String(user.manifestBase)
      : resolveBundledEnv('VITE_FRONTEND_PLUGIN_BASE', DEF.manifestBase) || DEF.manifestBase

  const manifestListPath = ensureLeadingPath(
    user.manifestListPath !== undefined && user.manifestListPath !== ''
      ? user.manifestListPath
      : resolveBundledEnv('VITE_WEB_PLUGIN_MANIFEST_PATH', DEF.manifestListPath)
  )

  const defaultImplicitDevPluginIds =
    Array.isArray(user.defaultImplicitDevPluginIds)
      ? user.defaultImplicitDevPluginIds.map(String).filter(Boolean)
      : (() => {
          const e = resolveBundledEnv('VITE_WEB_PLUGIN_IMPLICIT_DEV_IDS', '')
          if (e) {
            return e
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          }
          return [...DEF.defaultImplicitDevPluginIds]
        })()

  const allowedScriptHosts =
    Array.isArray(user.allowedScriptHosts) && user.allowedScriptHosts.length > 0
      ? user.allowedScriptHosts.map((h) => normalizeHost(String(h))).filter(Boolean)
      : (() => {
          const e = resolveBundledEnv('VITE_WEB_PLUGIN_ALLOWED_SCRIPT_HOSTS', '')
          if (e) {
            return e
              .split(',')
              .map((s) => normalizeHost(s.trim()))
              .filter(Boolean)
          }
          return [...DEF.allowedScriptHosts]
        })()

  const bridgeAllowedPathPrefixes =
    Array.isArray(user.bridgeAllowedPathPrefixes) && user.bridgeAllowedPathPrefixes.length > 0
      ? user.bridgeAllowedPathPrefixes.map((p) => ensureLeadingPath(p)).filter(Boolean)
      : (() => {
          const e = resolveBundledEnv('VITE_WEB_PLUGIN_BRIDGE_PREFIXES', '')
          if (e) {
            return e
              .split(',')
              .map((s) => ensureLeadingPath(s.trim()))
              .filter(Boolean)
          }
          return [...DEF.bridgeAllowedPathPrefixes]
        })()

  return {
    manifestBase: manifestBaseRaw.replace(/\/$/, '') || DEF.manifestBase.replace(/\/$/, ''),
    manifestListPath,
    manifestFetchCredentials: resolveManifestCredentials(
      user.manifestFetchCredentials,
      'VITE_WEB_PLUGIN_MANIFEST_CREDENTIALS',
      DEF.manifestFetchCredentials
    ),
    isDev: user.isDev !== undefined ? user.isDev : resolveBundledIsDev(),
    webPluginDevOrigin:
      user.webPluginDevOrigin !== undefined ? user.webPluginDevOrigin : resolveBundledEnv('VITE_WEB_PLUGIN_DEV_ORIGIN', ''),
    webPluginDevIds:
      user.webPluginDevIds !== undefined ? user.webPluginDevIds : resolveBundledEnv('VITE_WEB_PLUGIN_DEV_IDS', ''),
    webPluginDevMapJson:
      user.webPluginDevMapJson !== undefined
        ? user.webPluginDevMapJson
        : resolveBundledEnv('VITE_WEB_PLUGIN_DEV_MAP', ''),
    webPluginDevEntryPath: ensureLeadingPath(
      user.webPluginDevEntryPath !== undefined && user.webPluginDevEntryPath !== ''
        ? user.webPluginDevEntryPath
        : resolveBundledEnv('VITE_WEB_PLUGIN_DEV_ENTRY', DEF.webPluginDevEntryPath)
    ),
    devPingPath: ensureLeadingPath(
      user.devPingPath !== undefined && user.devPingPath !== ''
        ? user.devPingPath
        : resolveBundledEnv('VITE_WEB_PLUGIN_DEV_PING_PATH', DEF.devPingPath)
    ),
    devReloadSsePath: ensureLeadingPath(
      user.devReloadSsePath !== undefined && user.devReloadSsePath !== ''
        ? user.devReloadSsePath
        : resolveBundledEnv('VITE_WEB_PLUGIN_DEV_SSE_PATH', DEF.devReloadSsePath)
    ),
    devPingTimeoutMs: resolvePositiveInt(user.devPingTimeoutMs, 'VITE_WEB_PLUGIN_DEV_PING_TIMEOUT_MS', DEF.devPingTimeoutMs),
    defaultImplicitDevPluginIds,
    allowedScriptHosts,
    bridgeAllowedPathPrefixes,
    bootstrapSummary: user.bootstrapSummary
  }
}

/**
 * @param {ReturnType<typeof resolveRuntimeOptions>} opts
 */
function shouldShowBootstrapSummary(opts) {
  if (opts.bootstrapSummary === true) {
    return true
  }
  if (opts.bootstrapSummary === false) {
    return false
  }
  const env = resolveBundledEnv('VITE_PLUGINS_BOOTSTRAP_SUMMARY', '')
  if (env === '0' || env === 'false') {
    return false
  }
  if (env === '1' || env === 'true') {
    return true
  }
  return resolveBundledIsDev()
}

/**
 * @param {string} hostname
 */
function normalizeHost(hostname) {
  if (!hostname) {
    return ''
  }
  const h = hostname.toLowerCase()
  if (h.startsWith('[') && h.endsWith(']')) {
    return h.slice(1, -1)
  }
  return h
}

/**
 * @param {string[]} hostnames
 * @returns {Set<string>}
 */
function buildAllowedScriptHostsSet(hostnames) {
  const s = new Set()
  for (const h of hostnames) {
    const n = normalizeHost(h)
    if (n) {
      s.add(n)
    }
  }
  return s
}

/**
 * @param {string} url
 * @param {Set<string>} hostSet
 */
function isScriptHostAllowed(url, hostSet) {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    const u = new URL(url, window.location.origin)
    const h = normalizeHost(u.hostname)
    return hostSet.has(h)
  } catch {
    return false
  }
}

/**
 * @param {ReturnType<typeof resolveRuntimeOptions>} opts
 */
function parseWebPluginDevMapExplicit(opts) {
  if (!opts.isDev) {
    return null
  }
  const raw = opts.webPluginDevMapJson
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return null
  }
  try {
    const map = JSON.parse(String(raw))
    return map && typeof map === 'object' ? map : null
  } catch {
    console.warn('[plugins] webPluginDevMapJson / VITE_WEB_PLUGIN_DEV_MAP is not valid JSON')
    return null
  }
}

/**
 * @param {ReturnType<typeof resolveRuntimeOptions>} opts
 * @param {Set<string>} hostSet
 */
async function buildImplicitWebPluginDevMap(opts, hostSet) {
  if (!opts.isDev) {
    return {}
  }
  const origin =
    opts.webPluginDevOrigin === undefined || opts.webPluginDevOrigin === null
      ? ''
      : String(opts.webPluginDevOrigin).trim()
  if (!origin) {
    return {}
  }
  if (!isScriptHostAllowed(`${origin}/`, hostSet)) {
    return {}
  }

  const idsRaw = opts.webPluginDevIds
  const ids =
    idsRaw !== undefined && idsRaw !== null && String(idsRaw).trim() !== ''
      ? String(idsRaw)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [...opts.defaultImplicitDevPluginIds]

  if (ids.length === 0) {
    return {}
  }

  const base = origin.replace(/\/$/, '')
  const pingUrl = `${base}${opts.devPingPath}`
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), opts.devPingTimeoutMs)
    const r = await fetch(pingUrl, {
      mode: 'cors',
      cache: 'no-store',
      signal: ctrl.signal
    })
    clearTimeout(timer)
    if (!r.ok) {
      return {}
    }
    const body = (await r.text()).trim()
    if (body !== 'ok') {
      return {}
    }
  } catch {
    return {}
  }

  const pathPart = opts.webPluginDevEntryPath
  const map = {}
  for (const id of ids) {
    map[id] = `${base}${pathPart}`
  }
  if (ids.length) {
    console.info(
      '[plugins] 已检测到插件 dev 服务（',
      base,
      '），下列 id 将加载隐式 dev 入口（',
      pathPart,
      '）而非清单 dist：',
      ids.join(', ')
    )
  }
  return map
}

/**
 * @param {Record<string, string>} implicit
 * @param {Record<string, string>|null} explicit
 */
function mergeDevMaps(implicit, explicit) {
  const i = implicit && typeof implicit === 'object' ? implicit : {}
  const e = explicit && typeof explicit === 'object' ? explicit : {}
  return { ...i, ...e }
}

/** @type {Map<string, EventSource>} */
const pluginDevEventSources = new Map()

let pluginDevBeforeUnloadRegistered = false

function closeAllPluginDevEventSources() {
  for (const es of pluginDevEventSources.values()) {
    try {
      es.close()
    } catch (_) {}
  }
  pluginDevEventSources.clear()
}

function ensurePluginDevBeforeUnload() {
  if (pluginDevBeforeUnloadRegistered || typeof window === 'undefined') {
    return
  }
  pluginDevBeforeUnloadRegistered = true
  window.addEventListener('beforeunload', closeAllPluginDevEventSources)
}

/**
 * @param {string} origin
 * @param {Set<string>} hostSet
 */
function isDevOriginAllowedForSse(origin, hostSet) {
  try {
    const u = new URL(origin)
    return hostSet.has(normalizeHost(u.hostname))
  } catch {
    return false
  }
}

/**
 * @param {string} origin
 * @param {boolean} isDev
 * @param {Set<string>} hostSet
 * @param {string} ssePath
 */
function startPluginDevReloadSse(origin, isDev, hostSet, ssePath) {
  if (!isDev || pluginDevEventSources.has(origin)) {
    return
  }
  if (!isDevOriginAllowedForSse(origin, hostSet)) {
    return
  }
  ensurePluginDevBeforeUnload()
  const base = origin.replace(/\/$/, '')
  const url = `${base}${ssePath}`
  try {
    const es = new EventSource(url)
    pluginDevEventSources.set(origin, es)
    es.addEventListener('reload', () => {
      window.location.reload()
    })
    es.onopen = () => {
      console.info('[plugins] plugin dev reload SSE:', url)
    }
  } catch (e) {
    console.warn('[plugins] EventSource failed', url, e)
  }
}

/**
 * @param {Record<string, string>|null|undefined} devMap
 * @param {boolean} isDev
 * @param {Set<string>} hostSet
 * @param {string} ssePath
 */
function startPluginDevSseForMap(devMap, isDev, hostSet, ssePath) {
  if (!isDev || !devMap || typeof window === 'undefined') {
    return
  }
  const origins = new Set()
  for (const entry of Object.values(devMap)) {
    if (typeof entry !== 'string') {
      continue
    }
    const t = entry.trim()
    if (!t) {
      continue
    }
    try {
      origins.add(new URL(t, window.location.href).origin)
    } catch {
      /* skip */
    }
  }
  for (const o of origins) {
    startPluginDevReloadSse(o, isDev, hostSet, ssePath)
  }
}

const loadScriptMemo = new Map()

function loadScript(src) {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('loadScript: no document'))
  }
  if (loadScriptMemo.has(src)) {
    return loadScriptMemo.get(src)
  }
  const p = new Promise((resolve, reject) => {
    const scripts = document.getElementsByTagName('script')
    for (let i = 0; i < scripts.length; i++) {
      const el = scripts[i]
      if (el.src === src) {
        if (el.getAttribute('data-wep-loaded') === 'true') {
          resolve()
          return
        }
        el.addEventListener(
          'load',
          () => {
            el.setAttribute('data-wep-loaded', 'true')
            resolve()
          },
          { once: true }
        )
        el.addEventListener('error', () => reject(new Error('loadScript failed: ' + src)), { once: true })
        return
      }
    }
    const s = document.createElement('script')
    s.async = true
    s.src = src
    s.onload = () => {
      s.setAttribute('data-wep-loaded', 'true')
      resolve()
    }
    s.onerror = () => reject(new Error('loadScript failed: ' + src))
    document.head.appendChild(s)
  })
  loadScriptMemo.set(src, p)
  p.catch(() => loadScriptMemo.delete(src))
  return p
}

/**
 * @param {{ id: string }} p
 * @param {string} [entryUrl]
 * @param {Record<string, string>|null|undefined} devMap
 * @param {Set<string>} hostSet
 */
async function loadPluginEntry(p, entryUrl, devMap, hostSet) {
  const devEntry = devMap && typeof devMap[p.id] === 'string' ? devMap[p.id].trim() : ''
  if (devEntry) {
    if (!isScriptHostAllowed(devEntry, hostSet)) {
      console.warn('[plugins] dev entry URL not allowed', p.id, devEntry)
      return
    }
    try {
      await import(
        /* webpackIgnore: true */
        /* @vite-ignore */
        devEntry
      )
    } catch (e) {
      console.warn('[plugins] dev module import failed, try manifest entryUrl', p.id, e)
      if (entryUrl && isScriptHostAllowed(entryUrl, hostSet)) {
        await loadScript(entryUrl)
      }
      return
    }
    return
  }
  if (!entryUrl || !isScriptHostAllowed(entryUrl, hostSet)) {
    console.warn('[plugins] skip (entryUrl not allowed)', p.id, entryUrl)
    return
  }
  await loadScript(entryUrl)
}

/**
 * @param {import('vue-router').default} router
 * @param {(pluginId: string, router: import('vue-router').default, hostKit?: { bridgeAllowedPathPrefixes: string[] }) => object} createHostApiFactory
 *        始终传入三个参数；单参工厂 `(id) => createHostApi(id, router)` 仍可用，后两个实参被忽略。
 * @param {WebExtendPluginRuntimeOptions} [runtimeOptions]
 */
export async function bootstrapPlugins(router, createHostApiFactory, runtimeOptions) {
  if (typeof window === 'undefined') {
    console.warn('[plugins] bootstrapPlugins skipped: requires browser (window)')
    return
  }
  const opts = resolveRuntimeOptions(runtimeOptions || {})
  const base = String(opts.manifestBase).replace(/\/$/, '')
  const manifestUrl = `${base}${opts.manifestListPath}`
  const hostSet = buildAllowedScriptHostsSet(opts.allowedScriptHosts)
  const explicit = parseWebPluginDevMapExplicit(opts)

  const [manifestResult, implicit] = await Promise.all([
    (async () => {
      try {
        const res = await fetch(manifestUrl, { credentials: opts.manifestFetchCredentials })
        if (!res.ok) {
          return { ok: false, status: res.status, data: null }
        }
        const data = await res.json()
        return { ok: true, data }
      } catch (e) {
        return { ok: false, error: e, data: null }
      }
    })(),
    buildImplicitWebPluginDevMap(opts, hostSet)
  ])

  const devMap = mergeDevMaps(implicit, explicit)
  startPluginDevSseForMap(devMap, opts.isDev, hostSet, opts.devReloadSsePath)

  const hostKit = { bridgeAllowedPathPrefixes: opts.bridgeAllowedPathPrefixes }

  if (!manifestResult.ok) {
    if (manifestResult.error) {
      console.warn('[plugins] fetch manifest failed', manifestResult.error)
    } else {
      console.warn('[plugins] manifest HTTP', manifestResult.status, manifestUrl)
    }
    if (shouldShowBootstrapSummary(opts)) {
      console.info('[plugins] bootstrap_summary', { ok: false, reason: 'manifest_fetch' })
    }
    return
  }
  /** @type {{ hostPluginApiVersion?: string, plugins?: object[] }} */
  const data = manifestResult.data
  if (!data) {
    if (shouldShowBootstrapSummary(opts)) {
      console.info('[plugins] bootstrap_summary', { ok: false, reason: 'manifest_empty_body' })
    }
    return
  }

  const apiVer = data.hostPluginApiVersion
  if (apiVer) {
    const coerced = coerce(apiVer)
    const maj = coerced ? coerced.major : 0
    const range = `^${maj}.0.0`
    if (!satisfies(HOST_PLUGIN_API_VERSION, range, { includePrerelease: true })) {
      console.warn(
        '[plugins] host API version mismatch: host implements',
        HOST_PLUGIN_API_VERSION,
        'server declares',
        apiVer
      )
    }
  }

  window.__PLUGIN_ACTIVATORS__ = window.__PLUGIN_ACTIVATORS__ || {}

  const plugins = data.plugins || []
  if (plugins.length === 0) {
    console.info(
      '[plugins] 清单为空。请检查：① 后端清单服务（plugin-web-starter）是否已接入；② web-plugin.web-plugins-dir 是否指向含各插件子目录及 manifest.json 的路径；③ 浏览器直接访问',
      manifestUrl,
      '是否返回 plugins 条目。'
    )
  }

  const summary = {
    manifestCount: plugins.length,
    activated: 0,
    skipEngines: 0,
    skipLoad: 0,
    skipNoActivator: 0,
    activateFail: 0
  }

  for (const p of plugins) {
    const range = p.engines && p.engines.host
    if (range && !satisfies(HOST_PLUGIN_API_VERSION, range, { includePrerelease: true })) {
      console.warn('[plugins] skip (engines.host)', p.id, range)
      summary.skipEngines++
      continue
    }
    const entryUrl = p.entryUrl
    try {
      await loadPluginEntry(p, entryUrl, devMap, hostSet)
    } catch (e) {
      console.warn('[plugins] script load failed', p.id, e)
      summary.skipLoad++
      continue
    }
    const activator = window.__PLUGIN_ACTIVATORS__[p.id]
    if (typeof activator !== 'function') {
      console.warn('[plugins] no activator for', p.id)
      summary.skipNoActivator++
      continue
    }
    const hostApi = createHostApiFactory(p.id, router, hostKit)
    try {
      activator(hostApi)
      summary.activated++
    } catch (e) {
      console.error('[plugins] activate failed', p.id, e)
      summary.activateFail++
    }
  }

  if (shouldShowBootstrapSummary(opts)) {
    console.info('[plugins] bootstrap_summary', { ok: true, ...summary })
  }
}
