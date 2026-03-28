package io.github.xtemplus.pluginframework.core.runtime;

import io.github.xtemplus.pluginframework.core.extension.ExtensionPointImplementation;
import io.github.xtemplus.pluginframework.core.extension.ExtensionPointRegistry;
import io.github.xtemplus.pluginframework.core.registry.ExtensionRegistry;
import io.github.xtemplus.pluginframework.core.registry.PluginScopedExtensionRegistry;
import io.github.xtemplus.pluginframework.core.registry.PluginRegistryManager;
import io.github.xtemplus.pluginframework.core.security.PluginSecurityUtil;
import io.github.xtemplus.pluginframework.core.spi.Plugin;
import io.github.xtemplus.pluginframework.core.common.PluginConstants;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Properties;
import java.util.ServiceLoader;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * 插件管理器：从指定目录或单个 jar 加载/卸载/停用插件，维护元数据，支持可选安全校验。
 *
 * <p>主要能力：
 *
 * <ul>
 *   <li>启动时扫描目录下 *.jar 并加载（可配合安全校验）
 *   <li>运行期单 jar 加载（热插拔）、卸载（删除 jar）、停用（移至 disabled 并释放句柄）
 *   <li>同 ID 覆盖时先停用旧插件再加载新插件
 *   <li>通过 {@link #configureSecurity} 启用后，仅加载通过 {@link PluginSecurityUtil} 校验的 jar
 * </ul>
 */
public final class PluginManager {

    private final Logger logger = Logger.getLogger(PluginManager.class.getName());

    /** 已加载的插件列表（顺序与加载顺序一致）。 */
    private final List<Plugin> plugins = new ArrayList<>();

    /** 按插件 ID 索引的插件实例。 */
    private final Map<String, Plugin> pluginsById = new HashMap<>();

    /** 当前激活的插件 jar 路径（pluginId -> Path）。 */
    private final Map<String, Path> pluginJarPaths = new HashMap<>();

    /** 插件元数据（pluginId -> PluginMetadata）。 */
    private final Map<String, PluginMetadata> metadataById = new HashMap<>();

    /** 插件 ClassLoader，用于卸载时关闭。 */
    private final Map<String, ClassLoader> pluginClassLoaders = new HashMap<>();

    /** 停用后保留的 jar 路径，用于同 ID 再次上传时替换并释放句柄。 */
    private final Map<String, Path> disabledJarPaths = new HashMap<>();

    private static final String DISABLED_SUBDIR = PluginConstants.DISABLED_SUBDIR;

    /**
     * 将 pluginId 转为可作文件名的字符串（仅保留字母数字、点、横线、下划线）。
     */
    private static String sanitizePluginIdForFileName(String pluginId) {
        if (pluginId == null || pluginId.isEmpty()) {
            return "plugin";
        }
        return pluginId.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    /**
     * 返回停用状态下该插件 jar 在 plugins 目录下的相对路径，用于持久化到 plugin-disabled.json。
     * 格式固定为 disabled/{pluginId}.jar（pluginId 已做文件名安全处理）。
     */
    public static String getDisabledJarRelativePath(String pluginId) {
        return DISABLED_SUBDIR
                + PluginConstants.PATH_SEPARATOR
                + sanitizePluginIdForFileName(pluginId)
                + PluginConstants.SUFFIX_JAR;
    }

    /**
     * 返回激活状态下该插件 jar 在 plugins 目录下的文件名（固定命名，便于上传时覆盖）。
     */
    public static String getActiveJarFileName(String pluginId) {
        return sanitizePluginIdForFileName(pluginId) + PluginConstants.SUFFIX_JAR;
    }

    /** 安全校验启用时使用的注册表管理器（可选）。 */
    private PluginRegistryManager pluginRegistryManager;

    /** 扩展点注册表（从 context 懒设置），用于插件卸载时移除该插件注册的扩展点。 */
    private ExtensionRegistry extensionRegistry;

    /** 安全校验使用的密钥。 */
    private String securitySecret;

    /** 安全 token 中 nonce 长度。 */
    private int securityNonceLength = 8;

    /** 安全 token 总长度。 */
    private int securityTokenLength = 24;

    /** 扩展点契约注册表（从 context 懒设置），用于声明式扩展点注册与卸载时移除。 */
    private ExtensionPointRegistry extensionPointRegistry;

    /**
     * 扫描目录下所有 *.jar 并加载插件；若已配置安全则仅加载通过校验的 jar。
     *
     * <p>与 {@link #loadPlugin}、{@link #getPlugins} 等共用实例锁，避免与并发读状态交叉时出现不一致视图。
     *
     * @param pluginsDir 插件目录
     * @param context 插件上下文
     */
    public synchronized void loadPlugins(Path pluginsDir, PluginContext context) {
        Objects.requireNonNull(pluginsDir, "pluginsDir");
        Objects.requireNonNull(context, "context");
        if (!Files.isDirectory(pluginsDir)) {
            logger.log(Level.INFO, "plugins directory not found: {0}", pluginsDir);
            return;
        }
        try (DirectoryStream<Path> stream =
                Files.newDirectoryStream(pluginsDir, PluginConstants.GLOB_JAR_FILES)) {
            for (Path jar : stream) {
                // 已配置安全时仅加载通过 HMAC 校验的 jar
                if (pluginRegistryManager != null && securitySecret != null) {
                    loadPluginWithSecurity(jar, context);
                } else {
                    loadPlugin(jar, context);
                }
            }
        } catch (IOException e) {
            logger.log(Level.SEVERE, "failed to scan plugins directory", e);
        }
    }

    /**
     * 配置安全校验：启用后仅加载通过 {@link PluginSecurityUtil#verifyFileNameAndMetadata} 的 jar。
     *
     * @param registryManager 注册表管理器
     * @param secret 密钥
     * @param nonceLength nonce 长度
     * @param tokenLength token 总长度
     */
    public synchronized void configureSecurity(
            PluginRegistryManager registryManager,
            String secret,
            int nonceLength,
            int tokenLength) {
        this.pluginRegistryManager = Objects.requireNonNull(registryManager, "registryManager");
        this.securitySecret = Objects.requireNonNull(secret, "secret");
        if (nonceLength < 1) {
            throw new IllegalArgumentException("security nonce length must be >= 1");
        }
        if (tokenLength < 1) {
            throw new IllegalArgumentException("security token length must be >= 1");
        }
        if (tokenLength < nonceLength) {
            throw new IllegalArgumentException(
                    "security token max length must be >= nonce length ("
                            + nonceLength
                            + " > "
                            + tokenLength
                            + ")");
        }
        this.securityNonceLength = nonceLength;
        this.securityTokenLength = tokenLength;
    }

    public synchronized List<Plugin> getPlugins() {
        return Collections.unmodifiableList(new ArrayList<>(plugins));
    }

    public synchronized Map<String, PluginMetadata> getPluginMetadata() {
        return Collections.unmodifiableMap(new HashMap<>(metadataById));
    }

    /**
     * 卸载指定 ID 的插件，从磁盘删除对应的 jar 文件，便于再次上传时目录干净。
     *
     * @param pluginId 插件唯一标识
     * @return 是否找到并卸载了插件
     */
    public synchronized boolean uninstallPlugin(String pluginId) {
        Objects.requireNonNull(pluginId, "pluginId");
        Plugin plugin = pluginsById.remove(pluginId);
        if (plugin == null) {
            return false;
        }
        Path jarPath = pluginJarPaths.remove(pluginId);
        try {
            plugin.onDisable();
        } catch (RuntimeException ex) {
            logger.log(Level.WARNING, "failed to disable plugin: " + pluginId, ex);
        }
        plugins.remove(plugin);
        metadataById.remove(pluginId);
        closeClassLoader(pluginId);
        // 扩展点与扩展注册表按 pluginId 清理，避免残留
        if (extensionPointRegistry != null) {
            extensionPointRegistry.removeImplementationsByPluginId(pluginId);
        }
        if (extensionRegistry != null) {
            extensionRegistry.unregisterByPluginId(pluginId);
        }
        if (jarPath != null) {
            try {
                Files.deleteIfExists(jarPath);
            } catch (IOException ex) {
                logger.log(Level.WARNING, "failed to delete plugin jar: " + jarPath, ex);
            }
        }
        return true;
    }

    /**
     * 停用指定 ID 的插件并释放其 jar 文件句柄，便于后续上传同 ID 新版本时覆盖原文件。
     * 会先关闭 ClassLoader，再将 jar 移动到 plugins/disabled/ 子目录，使原路径可写；
     * 若移动失败（如 Windows 下句柄未及时释放），则仅记录“下次上传用新路径”，不删除原文件。
     *
     * @param pluginId 插件唯一标识
     * @return 是否找到并停用了插件
     */
    public synchronized boolean deactivatePlugin(String pluginId) {
        Objects.requireNonNull(pluginId, "pluginId");
        Plugin plugin = pluginsById.remove(pluginId);
        if (plugin == null) {
            return false;
        }
        // 在 remove 前取出 jar 路径，用于后续移动到 disabled 目录
        Path jarPath = pluginJarPaths.get(pluginId);
        try {
            plugin.onDisable();
        } catch (RuntimeException ex) {
            logger.log(Level.WARNING, "failed to disable plugin: " + pluginId, ex);
        }
        plugins.remove(plugin);
        metadataById.remove(pluginId);
        pluginJarPaths.remove(pluginId);
        closeClassLoader(pluginId);
        if (extensionPointRegistry != null) {
            extensionPointRegistry.removeImplementationsByPluginId(pluginId);
        }
        if (extensionRegistry != null) {
            extensionRegistry.unregisterByPluginId(pluginId);
        }
        if (jarPath != null) {
            Path pluginsDir = jarPath.getParent();
            Path disabledDir = pluginsDir.resolve(DISABLED_SUBDIR);
            try {
                Files.createDirectories(disabledDir);
                Path destInDisabled =
                        disabledDir.resolve(
                                sanitizePluginIdForFileName(pluginId) + PluginConstants.SUFFIX_JAR);
                try {
                    Files.move(jarPath, destInDisabled, StandardCopyOption.REPLACE_EXISTING);
                    disabledJarPaths.put(pluginId, destInDisabled);
                } catch (IOException moveEx) {
                    // 移动失败（如句柄未释放）时尝试复制，保证原路径可被覆盖
                    try {
                        Files.copy(jarPath, destInDisabled, StandardCopyOption.REPLACE_EXISTING);
                    } catch (IOException copyEx) {
                        logger.log(
                                Level.WARNING,
                                "copy jar to disabled also failed: {0}",
                                jarPath);
                    }
                    logger.log(
                            Level.WARNING,
                            "move jar to disabled failed (file may still be locked), copied instead: {0}",
                            jarPath);
                    disabledJarPaths.put(pluginId, destInDisabled);
                }
            } catch (IOException e) {
                logger.log(
                        Level.WARNING,
                        "create disabled dir or move/copy jar failed: {0}",
                        jarPath);
            }
        }
        return true;
    }

    /**
     * 获取停用状态下该 pluginId 对应的 jar 路径（用于上传同 ID 时替换）。
     *
     * @param pluginId 插件唯一标识
     * @return jar 路径，未停用或已清除则 empty
     */
    public synchronized Optional<Path> getDisabledJarPath(String pluginId) {
        return Optional.ofNullable(disabledJarPaths.get(pluginId));
    }

    /**
     * 返回所有停用插件 ID 与其 jar 路径的只读视图。
     */
    public synchronized Map<String, Path> getDisabledJarPaths() {
        return Collections.unmodifiableMap(new HashMap<>(disabledJarPaths));
    }

    /**
     * 清除停用记录（上传同 ID 并加载成功后调用）。
     *
     * @param pluginId 插件唯一标识
     */
    public synchronized void clearDisabledEntry(String pluginId) {
        disabledJarPaths.remove(pluginId);
    }

    /**
     * 从外部恢复停用记录（如从 JSON 文件加载），用于进程重启后仍能“上传同 ID 覆盖”。
     * 会先清空当前停用记录，再写入传入的映射；仅用于从持久化恢复状态，请勿作为普通 setter 使用。
     *
     * @param pluginIdToPath pluginId -> 下次上传时写入的路径（通常为 pluginsDir 下的绝对路径）
     */
    public synchronized void restoreDisabledState(Map<String, Path> pluginIdToPath) {
        disabledJarPaths.clear();
        if (pluginIdToPath != null) {
            disabledJarPaths.putAll(pluginIdToPath);
        }
    }

    /**
     * 从外部恢复停用记录（如从 JSON 文件加载）。
     *
     * @param pluginIdToPath pluginId -> 路径映射
     * @deprecated 请使用 {@link #restoreDisabledState(Map)}，语义更明确
     */
    @Deprecated
    public void setDisabledJarPaths(Map<String, Path> pluginIdToPath) {
        restoreDisabledState(pluginIdToPath);
    }

    private void closeClassLoader(String pluginId) {
        ClassLoader loader = pluginClassLoaders.remove(pluginId);
        // 一个 jar 仅对应一个 URLClassLoader；若同一 jar 通过 SPI 暴露多个 Plugin，卸载其一即会关闭该 ClassLoader，影响同 jar 其他插件。推荐一 jar 一插件。
        if (loader instanceof URLClassLoader) {
            try {
                ((URLClassLoader) loader).close();
            } catch (IOException ex) {
                logger.log(Level.WARNING, "failed to close classloader for plugin: " + pluginId, ex);
            }
        }
    }

    /** 加载失败且未登记到任何 pluginId 时释放孤儿 URLClassLoader。 */
    private static void closeOrphanUrlClassLoader(URLClassLoader classLoader) {
        if (classLoader == null) {
            return;
        }
        try {
            classLoader.close();
        } catch (IOException ex) {
            Logger.getLogger(PluginManager.class.getName())
                    .log(Level.WARNING, "failed to close orphan plugin URLClassLoader", ex);
        }
    }

    /**
     * 从单个 jar 加载插件，可在运行期调用实现热插拔加载。
     *
     * @param jar 插件 jar 路径
     * @param context 插件上下文
     * @return 加载结果
     */
    public synchronized PluginLoadResult loadPlugin(Path jar, PluginContext context) {
        Objects.requireNonNull(jar, "jar");
        Objects.requireNonNull(context, "context");
        if (!Files.isRegularFile(jar)) {
            logger.log(Level.WARNING, "plugin jar not found: {0}", jar);
            return PluginLoadResult.empty();
        }
        return loadPluginJar(jar, context, false);
    }

    /**
     * 上传 jar 并加载插件：将输入流写入插件目录、校验元数据、处理同 ID 覆盖或停用恢复，再调用
     * {@link #loadPlugin(Path, PluginContext)}。不包含 Spring MVC 注册，由上层（如 plugin-spring-starter）
     * 根据返回的 {@link PluginLoadResult} 调用注册器完成“上传并注册”。
     *
     * @param pluginsDir 插件目录（不存在时会创建）
     * @param jarStream 插件 jar 输入流（由调用方关闭）
     * @param originalFilename 原始文件名，用于校验 .jar 后缀
     * @param context 插件上下文
     * @return 成功时包含加载结果，失败时包含错误原因
     */
    public synchronized UploadAndLoadResult uploadAndLoad(
            Path pluginsDir,
            InputStream jarStream,
            String originalFilename,
            PluginContext context) {
        Objects.requireNonNull(pluginsDir, "pluginsDir");
        Objects.requireNonNull(jarStream, "jarStream");
        Objects.requireNonNull(context, "context");
        if (originalFilename == null || !originalFilename.endsWith(PluginConstants.SUFFIX_JAR)) {
            return UploadAndLoadResult.failure(
                    "插件文件名不合法，必须为 .jar 结尾且遵循安全命名规范");
        }
        try {
            Files.createDirectories(pluginsDir);
        } catch (IOException e) {
            logger.log(Level.WARNING, "failed to create plugins dir: {0}", pluginsDir);
            return UploadAndLoadResult.failure("无法创建插件目录: " + pluginsDir);
        }
        Path tempTarget =
                pluginsDir.resolve(
                        PluginConstants.UPLOAD_TEMP_PREFIX + System.currentTimeMillis() + PluginConstants.SUFFIX_JAR);
        try {
            Files.copy(jarStream, tempTarget, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            logger.log(Level.WARNING, "failed to copy uploaded jar to {0}", tempTarget);
            return UploadAndLoadResult.failure("保存上传文件失败");
        }
        PluginMetadata newMetadata = loadMetadataFromJar(tempTarget);
        if (newMetadata == null || !newMetadata.hasValidId()) {
            try {
                Files.deleteIfExists(tempTarget);
            } catch (IOException ignored) {
                // ignore
            }
            return UploadAndLoadResult.failure(
                    "无法读取插件元数据（META-INF/plugin.properties 或 plugin.id 无效）。");
        }
        String newPluginId = newMetadata.getId();
        if (metadataById.containsKey(newPluginId)) {
            try {
                Files.deleteIfExists(tempTarget);
            } catch (IOException ignored) {
                // ignore
            }
            return UploadAndLoadResult.failure(
                    "已存在同 ID 的已加载插件（"
                            + newPluginId
                            + "）。请先停用该插件后再上传新版本。");
        }
        Path target;
        // 若该 ID 曾停用，则覆盖 disabled 下 jar 并移回激活路径
        if (disabledJarPaths.containsKey(newPluginId)) {
            target = disabledJarPaths.get(newPluginId);
            try {
                Files.move(tempTarget, target, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException e) {
                try {
                    Files.deleteIfExists(tempTarget);
                } catch (IOException ignored) {
                    // ignore
                }
                return UploadAndLoadResult.failure("覆盖停用状态下的 jar 失败: " + e.getMessage());
            }
            Path activePath = pluginsDir.resolve(getActiveJarFileName(newPluginId));
            try {
                Files.move(target, activePath, StandardCopyOption.REPLACE_EXISTING);
                target = activePath;
            } catch (IOException e) {
                // 原 plugins/ 下文件仍被占用时，直接从 disabled 路径加载
            }
            clearDisabledEntry(newPluginId);
        } else {
            target = pluginsDir.resolve(getActiveJarFileName(newPluginId));
            try {
                Files.move(tempTarget, target, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException e) {
                try {
                    Files.deleteIfExists(tempTarget);
                } catch (IOException ignored) {
                    // ignore
                }
                return UploadAndLoadResult.failure("移动上传文件到目标位置失败: " + e.getMessage());
            }
        }
        PluginLoadResult result = loadPlugin(target, context);
        return UploadAndLoadResult.success(result);
    }

    /**
     * 使用安全校验加载单个 jar（文件名与元数据需通过 HMAC 校验）。
     *
     * @param jar 插件 jar 路径
     * @param context 插件上下文
     * @return 加载结果
     */
    public synchronized PluginLoadResult loadPluginWithSecurity(
            Path jar, PluginContext context) {
        Objects.requireNonNull(jar, "jar");
        Objects.requireNonNull(context, "context");
        if (!Files.isRegularFile(jar)) {
            logger.log(Level.WARNING, "plugin jar not found: {0}", jar);
            return PluginLoadResult.empty();
        }
        return loadPluginJar(jar, context, true);
    }

    /**
     * 从 jar 加载插件：解析元数据、校验安全（可选）、SPI 或约定式加载、注册扩展点与注册表。
     */
    private PluginLoadResult loadPluginJar(
            Path jar, PluginContext context, boolean securityEnabled) {
        List<Plugin> loaded = new ArrayList<>();
        List<String> replacedIds = new ArrayList<>();
        if (this.extensionRegistry == null) {
            this.extensionRegistry = context.getExtensionRegistry();
        }
        PluginMetadata metadata = loadMetadata(jar);
        if (metadata == null || !metadata.hasValidId()) {
            logger.log(
                    Level.WARNING,
                    "skip plugin jar without valid metadata: {0}",
                    jar);
            return new PluginLoadResult(loaded, replacedIds);
        }
        if (securityEnabled && pluginRegistryManager == null) {
            logger.log(
                    Level.WARNING,
                    "security is enabled but pluginRegistryManager is not configured, skip loading: {0}",
                    jar);
            return new PluginLoadResult(loaded, replacedIds);
        }
        if (securityEnabled) {
            String fileName = jar.getFileName().toString();
            boolean ok =
                    PluginSecurityUtil.verifyFileNameAndMetadata(
                            fileName,
                            metadata.getId(),
                            metadata.getName(),
                            metadata.getVersion(),
                            securitySecret,
                            securityNonceLength,
                            securityTokenLength);
            if (!ok) {
                logger.log(
                        Level.WARNING,
                        "plugin jar security verification failed, skip loading: {0}",
                        jar);
                return new PluginLoadResult(loaded, replacedIds);
            }
        }
        URLClassLoader classLoader = null;
        boolean classLoaderBoundToPlugin = false;
        try {
            URL url = jar.toUri().toURL();
            classLoader =
                    new URLClassLoader(new URL[] {url}, Plugin.class.getClassLoader());
            List<Plugin> toLoad = new ArrayList<>();
            for (Plugin plugin : ServiceLoader.load(Plugin.class, classLoader)) {
                toLoad.add(plugin);
            }
            // 无 SPI 时尝试约定式加载（需宿主 classpath 有 plugin-spring-spi）
            if (toLoad.isEmpty()) {
                Plugin defaultPlugin = createDefaultConventionPlugin(metadata, classLoader);
                if (defaultPlugin != null) {
                    toLoad.add(defaultPlugin);
                }
            }
            if (toLoad.isEmpty()) {
                logger.log(
                        Level.WARNING,
                        "no loadable Plugin implementation in jar (SPI or convention): {0}",
                        jar);
                return new PluginLoadResult(loaded, replacedIds);
            }
            for (Plugin plugin : toLoad) {
                String pluginId = plugin.getId();
                if (pluginId == null || pluginId.isEmpty()) {
                    logger.log(Level.WARNING, "skip plugin with empty id: {0}", plugin.getClass());
                    continue;
                }
                if (!pluginId.equals(metadata.getId())) {
                    logger.log(
                            Level.WARNING,
                            "skip plugin due to id mismatch, spiId={0}, metadataId={1}",
                            new Object[] {pluginId, metadata.getId()});
                    continue;
                }
                Plugin existing = pluginsById.get(pluginId);
                if (existing != null) {
                    // 同 ID 覆盖：先停用并移除旧插件，再加载新插件
                    logger.log(Level.INFO, "replacing existing plugin: {0}", pluginId);
                    try {
                        existing.onDisable();
                    } catch (RuntimeException ex) {
                        logger.log(Level.WARNING, "failed to disable existing plugin: " + pluginId, ex);
                    }
                    plugins.remove(existing);
                    metadataById.remove(pluginId);
                    Path oldJar = pluginJarPaths.remove(pluginId);
                    closeClassLoader(pluginId);
                    if (extensionPointRegistry != null) {
                        extensionPointRegistry.removeImplementationsByPluginId(pluginId);
                    }
                    if (extensionRegistry != null) {
                        extensionRegistry.unregisterByPluginId(pluginId);
                    }
                    replacedIds.add(pluginId);
                    if (securityEnabled && oldJar != null) {
                        try {
                            Files.deleteIfExists(oldJar);
                        } catch (IOException ex) {
                            logger.log(
                                    Level.WARNING,
                                    "failed to delete old plugin jar: " + oldJar,
                                    ex);
                        }
                    }
                }
                logger.log(Level.INFO, "loading plugin: {0}", plugin.getName());
                PluginContext scopedContext =
                        context.withExtensionRegistry(
                                pluginId,
                                new PluginScopedExtensionRegistry(
                                        pluginId, context.getExtensionRegistry()));
                try {
                    plugin.onEnable(scopedContext);
                } catch (RuntimeException ex) {
                    logger.log(
                            Level.SEVERE,
                            "plugin onEnable failed, jar="
                                    + jar
                                    + " pluginClass="
                                    + plugin.getClass().getName(),
                            ex);
                    continue;
                }
                plugins.add(plugin);
                pluginsById.put(pluginId, plugin);
                pluginClassLoaders.put(pluginId, classLoader);
                metadataById.put(pluginId, metadata);
                pluginJarPaths.put(pluginId, jar);
                if (securityEnabled && pluginRegistryManager != null) {
                    pluginRegistryManager.upsertActiveEntry(metadata, jar, null);
                }
                loaded.add(plugin);
                classLoaderBoundToPlugin = true;

                ExtensionPointRegistry epRegistry = context.getExtensionPointRegistry();
                if (epRegistry != null) {
                    this.extensionPointRegistry = epRegistry;
                    List<DeclaredExtensionPoint> declared = metadata.getDeclaredExtensionPoints();
                    if (declared != null && !declared.isEmpty()) {
                        for (DeclaredExtensionPoint dep : declared) {
                            try {
                                if (dep.hasBuiltinHandler()) {
                                    ExtensionPointImplementation impl =
                                            ExtensionPointImplementation.builtin(
                                                    pluginId,
                                                    classLoader,
                                                    dep.getHandlerClass(),
                                                    dep.getHandlerMethod() != null
                                                            ? dep.getHandlerMethod()
                                                            : "handle",
                                                    0);
                                    epRegistry.registerImplementation(dep.getPointId(), impl);
                                } else if (dep.isHttp()
                                        && dep.getBaseUrl() != null
                                        && !dep.getBaseUrl().isEmpty()) {
                                    ExtensionPointImplementation impl =
                                            ExtensionPointImplementation.http(
                                                    pluginId, dep.getBaseUrl(), 0);
                                    epRegistry.registerImplementation(dep.getPointId(), impl);
                                }
                            } catch (RuntimeException ex) {
                                logger.log(
                                        Level.WARNING,
                                        "failed to register declared extension point "
                                                + dep.getPointId()
                                                + " for plugin "
                                                + pluginId,
                                        ex);
                            }
                        }
                    }
                }
            }
        } catch (MalformedURLException e) {
            logger.log(Level.SEVERE, "invalid plugin jar url: " + jar, e);
        } finally {
            if (classLoader != null && !classLoaderBoundToPlugin) {
                closeOrphanUrlClassLoader(classLoader);
            }
        }
        return new PluginLoadResult(loaded, replacedIds);
    }

    /**
     * 当 jar 内无 SPI 声明的 Plugin 时，尝试通过宿主 classpath 中的 DefaultConventionPlugin 创建约定式插件实例。
     * 需宿主依赖 plugin-spring-spi。
     */
    private static Plugin createDefaultConventionPlugin(
            PluginMetadata metadata, ClassLoader pluginClassLoader) {
        try {
            ClassLoader hostLoader = Plugin.class.getClassLoader();
            Class<?> clazz = Class.forName(
                    "io.github.xtemplus.pluginframework.spring.DefaultConventionPlugin",
                    true,
                    hostLoader);
            return (Plugin)
                    clazz.getConstructor(PluginMetadata.class, ClassLoader.class)
                            .newInstance(metadata, pluginClassLoader);
        } catch (ClassNotFoundException e) {
            return null;
        } catch (ReflectiveOperationException e) {
            Logger.getLogger(PluginManager.class.getName())
                    .log(Level.WARNING, "failed to create DefaultConventionPlugin", e);
            return null;
        }
    }

    /**
     * 从 jar 路径读取 META-INF/plugin.properties 并解析为元数据（用于上传前解析或加载前校验）。
     *
     * @param jar 插件 jar 路径
     * @return 元数据，无效或不存在则 null
     */
    public PluginMetadata loadMetadataFromJar(Path jar) {
        return loadMetadata(jar);
    }

    /** 内部：从 jar 读取 plugin.properties 并构建 PluginMetadata。 */
    private PluginMetadata loadMetadata(Path jar) {
        try (JarFile jarFile = new JarFile(jar.toFile())) {
            JarEntry entry = jarFile.getJarEntry(PluginConstants.METADATA_PATH);
            if (entry == null) {
                logger.log(
                        Level.WARNING,
                        "plugin metadata file "
                        + PluginConstants.METADATA_PATH
                        + " not found in jar: {0}",
                        jar);
                return null;
            }
            try (InputStream inputStream = jarFile.getInputStream(entry)) {
                Properties properties = new Properties();
                properties.load(inputStream);
                PluginMetadata metadata = PluginMetadata.fromProperties(properties);
                if (!metadata.hasValidId()) {
                    logger.log(
                            Level.WARNING,
                            "plugin metadata missing id in jar: {0}",
                            jar);
                    return null;
                }
                return metadata;
            }
        } catch (IOException e) {
            logger.log(Level.WARNING, "failed to load plugin metadata from jar: " + jar, e);
            return null;
        }
    }
}

