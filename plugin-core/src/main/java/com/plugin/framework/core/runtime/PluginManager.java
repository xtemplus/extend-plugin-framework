package com.plugin.framework.core.runtime;

import com.plugin.framework.core.registry.PluginRegistryManager;
import com.plugin.framework.core.security.PluginSecurityUtil;
import com.plugin.framework.core.spi.HttpMethod;
import com.plugin.framework.core.spi.Plugin;
import com.plugin.framework.core.spi.PluginEndpoint;
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
 * 简化版插件管理器：负责从指定目录加载插件 jar，并暴露端点查询能力。
 */
public final class PluginManager {

    private final Logger logger = Logger.getLogger(PluginManager.class.getName());

    private final List<Plugin> plugins = new ArrayList<>();

    private final List<PluginEndpoint> endpoints = new ArrayList<>();

    private final Map<String, Plugin> pluginsById = new HashMap<>();

    private final Map<String, List<PluginEndpoint>> endpointsByPluginId = new HashMap<>();

    private final Map<String, Path> pluginJarPaths = new HashMap<>();

    private final Map<String, PluginMetadata> metadataById = new HashMap<>();

    private final Map<String, ClassLoader> pluginClassLoaders = new HashMap<>();

    /** 停用后保留的 jar 路径，用于同 ID 再次上传时替换并释放句柄。 */
    private final Map<String, Path> disabledJarPaths = new HashMap<>();

    private static final String DISABLED_SUBDIR = "disabled";

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
        return DISABLED_SUBDIR + "/" + sanitizePluginIdForFileName(pluginId) + ".jar";
    }

    /**
     * 返回激活状态下该插件 jar 在 plugins 目录下的文件名（固定命名，便于上传时覆盖）。
     */
    public static String getActiveJarFileName(String pluginId) {
        return sanitizePluginIdForFileName(pluginId) + ".jar";
    }

    private PluginRegistryManager pluginRegistryManager;

    private String securitySecret;

    private int securityNonceLength = 8;

    private int securityTokenLength = 24;

    public void loadPlugins(Path pluginsDir, PluginContext context) {
        Objects.requireNonNull(pluginsDir, "pluginsDir");
        Objects.requireNonNull(context, "context");
        if (!Files.isDirectory(pluginsDir)) {
            logger.log(Level.INFO, "plugins directory not found: {0}", pluginsDir);
            return;
        }
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(pluginsDir, "*.jar")) {
            for (Path jar : stream) {
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

    public void configureSecurity(
            PluginRegistryManager registryManager,
            String secret,
            int nonceLength,
            int tokenLength) {
        this.pluginRegistryManager = Objects.requireNonNull(registryManager, "registryManager");
        this.securitySecret = Objects.requireNonNull(secret, "secret");
        this.securityNonceLength = nonceLength;
        this.securityTokenLength = tokenLength;
    }

    public List<Plugin> getPlugins() {
        return Collections.unmodifiableList(plugins);
    }

    public List<PluginEndpoint> getEndpoints() {
        return Collections.unmodifiableList(endpoints);
    }

    public Map<String, PluginMetadata> getPluginMetadata() {
        return Collections.unmodifiableMap(metadataById);
    }

    public Optional<PluginEndpoint> findEndpoint(String path, HttpMethod method) {
        return endpoints.stream()
                .filter(
                        endpoint ->
                                endpoint.getPath().equals(path)
                                        && endpoint.getMethod() == method)
                .findFirst();
    }

    /**
     * 卸载指定 ID 的插件，移除其端点并从磁盘删除对应的 jar 文件，便于再次上传时目录干净。
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
        List<PluginEndpoint> oldEndpoints = endpointsByPluginId.remove(pluginId);
        if (oldEndpoints != null) {
            endpoints.removeAll(oldEndpoints);
        }
        metadataById.remove(pluginId);
        closeClassLoader(pluginId);
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
        Path jarPath = pluginJarPaths.get(pluginId);
        try {
            plugin.onDisable();
        } catch (RuntimeException ex) {
            logger.log(Level.WARNING, "failed to disable plugin: " + pluginId, ex);
        }
        plugins.remove(plugin);
        List<PluginEndpoint> oldEndpoints = endpointsByPluginId.remove(pluginId);
        if (oldEndpoints != null) {
            endpoints.removeAll(oldEndpoints);
        }
        metadataById.remove(pluginId);
        pluginJarPaths.remove(pluginId);
        closeClassLoader(pluginId);
        if (jarPath != null) {
            Path pluginsDir = jarPath.getParent();
            Path disabledDir = pluginsDir.resolve(DISABLED_SUBDIR);
            try {
                Files.createDirectories(disabledDir);
                Path destInDisabled =
                        disabledDir.resolve(
                                sanitizePluginIdForFileName(pluginId) + ".jar");
                try {
                    Files.move(jarPath, destInDisabled, StandardCopyOption.REPLACE_EXISTING);
                    disabledJarPaths.put(pluginId, destInDisabled);
                } catch (IOException moveEx) {
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
    public Optional<Path> getDisabledJarPath(String pluginId) {
        return Optional.ofNullable(disabledJarPaths.get(pluginId));
    }

    /**
     * 返回所有停用插件 ID 与其 jar 路径的只读视图。
     */
    public Map<String, Path> getDisabledJarPaths() {
        return Collections.unmodifiableMap(new HashMap<>(disabledJarPaths));
    }

    /**
     * 清除停用记录（上传同 ID 并加载成功后调用）。
     *
     * @param pluginId 插件唯一标识
     */
    public void clearDisabledEntry(String pluginId) {
        disabledJarPaths.remove(pluginId);
    }

    /**
     * 从外部恢复停用记录（如从 JSON 文件加载），用于进程重启后仍能“上传同 ID 覆盖”。
     *
     * @param pluginIdToPath pluginId -> 下次上传时写入的路径（通常为 pluginsDir 下的相对或绝对路径）
     */
    public void setDisabledJarPaths(Map<String, Path> pluginIdToPath) {
        disabledJarPaths.clear();
        if (pluginIdToPath != null) {
            disabledJarPaths.putAll(pluginIdToPath);
        }
    }

    private void closeClassLoader(String pluginId) {
        ClassLoader loader = pluginClassLoaders.remove(pluginId);
        if (loader instanceof URLClassLoader) {
            try {
                ((URLClassLoader) loader).close();
            } catch (IOException ex) {
                logger.log(Level.WARNING, "failed to close classloader for plugin: " + pluginId, ex);
            }
        }
    }

    /**
     * 从单个 jar 加载插件，可在运行期调用实现热插拔加载。
     *
     * @param jar 插件 jar 路径
     * @param context 插件上下文
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

    private PluginLoadResult loadPluginJar(
            Path jar, PluginContext context, boolean securityEnabled) {
        List<Plugin> loaded = new ArrayList<>();
        List<String> replacedIds = new ArrayList<>();
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
        try {
            URL url = jar.toUri().toURL();
            URLClassLoader classLoader =
                    new URLClassLoader(new URL[] {url}, Plugin.class.getClassLoader());
            List<Plugin> toLoad = new ArrayList<>();
            for (Plugin plugin : ServiceLoader.load(Plugin.class, classLoader)) {
                toLoad.add(plugin);
            }
            if (toLoad.isEmpty()) {
                Plugin defaultPlugin = createDefaultConventionPlugin(metadata, classLoader);
                if (defaultPlugin != null) {
                    toLoad.add(defaultPlugin);
                }
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
                    logger.log(Level.INFO, "replacing existing plugin: {0}", pluginId);
                    try {
                        existing.onDisable();
                    } catch (RuntimeException ex) {
                        logger.log(Level.WARNING, "failed to disable existing plugin: " + pluginId, ex);
                    }
                    plugins.remove(existing);
                    List<PluginEndpoint> oldEndpoints = endpointsByPluginId.remove(pluginId);
                    if (oldEndpoints != null) {
                        endpoints.removeAll(oldEndpoints);
                    }
                    metadataById.remove(pluginId);
                    Path oldJar = pluginJarPaths.remove(pluginId);
                    closeClassLoader(pluginId);
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
                plugin.onEnable(context);
                plugins.add(plugin);
                pluginsById.put(pluginId, plugin);
                pluginClassLoaders.put(pluginId, classLoader);
                List<PluginEndpoint> pluginEndpoints = plugin.getEndpoints();
                if (pluginEndpoints != null && !pluginEndpoints.isEmpty()) {
                    endpoints.addAll(pluginEndpoints);
                    endpointsByPluginId.put(pluginId, new ArrayList<>(pluginEndpoints));
                } else {
                    endpointsByPluginId.remove(pluginId);
                }
                metadataById.put(pluginId, metadata);
                pluginJarPaths.put(pluginId, jar);
                if (securityEnabled && pluginRegistryManager != null) {
                    pluginRegistryManager.upsertActiveEntry(metadata, jar, null);
                }
                loaded.add(plugin);
            }
        } catch (MalformedURLException e) {
            logger.log(Level.SEVERE, "invalid plugin jar url: " + jar, e);
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
                    "com.plugin.framework.spring.DefaultConventionPlugin",
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
     * 从 jar 路径读取插件元数据（用于上传前解析 plugin.id 等）。
     *
     * @param jar 插件 jar 路径
     * @return 元数据，无效或不存在则 null
     */
    public PluginMetadata loadMetadataFromJar(Path jar) {
        return loadMetadata(jar);
    }

    private PluginMetadata loadMetadata(Path jar) {
        try (JarFile jarFile = new JarFile(jar.toFile())) {
            JarEntry entry = jarFile.getJarEntry("META-INF/plugin.properties");
            if (entry == null) {
                logger.log(
                        Level.WARNING,
                        "plugin metadata file META-INF/plugin.properties not found in jar: {0}",
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

