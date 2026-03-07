package com.plugin.framework.spring.manager;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plugin.framework.core.runtime.PluginContext;
import com.plugin.framework.core.runtime.PluginLoadResult;
import com.plugin.framework.core.runtime.PluginManager;
import com.plugin.framework.core.runtime.PluginMetadata;
import com.plugin.framework.core.runtime.UploadAndLoadResult;
import com.plugin.framework.core.spi.Plugin;
import com.plugin.framework.spring.config.PluginFrameworkProperties;
import com.plugin.framework.spring.exception.PluginArgumentException;
import com.plugin.framework.spring.exception.PluginFrameworkException;
import com.plugin.framework.spring.mvc.PluginSpringRegistrar;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.springframework.web.multipart.MultipartFile;

/**
 * Spring 环境的插件管理器：在 {@link PluginManager} 基础上，封装上传并注册、卸载、停用及停用状态持久化，
 * 并联动 {@link PluginSpringRegistrar} 完成 Spring MVC 的注册/取消注册。
 *
 * <p>上传并注册：调用 {@link PluginManager#uploadAndLoad} 后，根据 {@link PluginLoadResult} 对
 * 被替换的插件执行 {@link PluginSpringRegistrar#unregister}，对新加载的插件执行
 * {@link PluginSpringRegistrar#register}。
 *
 * <p>并发：对同一 pluginId 的卸载/停用建议由调用方串行化，避免并发下“先取元数据再卸载”之间的竞态。
 * 停用状态持久化为 best-effort，IO 失败时仅记录日志不抛异常。
 */
public class SpringPluginManager {

    private static final Logger logger =
            Logger.getLogger(SpringPluginManager.class.getName());
    private static final String DISABLED_STATE_FILE = "plugin-disabled.json";

    private final PluginManager pluginManager;
    private final PluginContext pluginContext;
    private final PluginSpringRegistrar pluginSpringRegistrar;
    private final PluginFrameworkProperties properties;
    private final ObjectMapper objectMapper;

    public SpringPluginManager(
            PluginManager pluginManager,
            PluginContext pluginContext,
            PluginSpringRegistrar pluginSpringRegistrar,
            PluginFrameworkProperties properties,
            ObjectMapper objectMapper) {
        this.pluginManager = Objects.requireNonNull(pluginManager, "pluginManager");
        this.pluginContext = Objects.requireNonNull(pluginContext, "pluginContext");
        this.pluginSpringRegistrar =
                Objects.requireNonNull(pluginSpringRegistrar, "pluginSpringRegistrar");
        this.properties = Objects.requireNonNull(properties, "properties");
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    /**
     * 上传插件 jar 并加载、注册到 Spring MVC。失败时抛出 {@link PluginFrameworkException} 或 {@link PluginArgumentException}。
     *
     * @param file 上传的插件 jar（MultipartFile）
     * @return 本次加载结果（新加载的插件列表与被替换的插件 ID 列表），便于调用方打日志或展示
     * @throws PluginArgumentException 文件为空、文件名不合法时
     * @throws PluginFrameworkException 元数据无效、同 ID 已加载、未发现有效插件或 IO 异常时
     */
    public PluginLoadResult uploadAndRegister(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new PluginArgumentException("插件文件不能为空");
        }
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.endsWith(".jar")) {
            throw new PluginArgumentException(
                    "插件文件名不合法，必须为 .jar 结尾且遵循安全命名规范");
        }
        Path pluginsDir = resolvePluginsDir();
        try (InputStream inputStream = file.getInputStream()) {
            UploadAndLoadResult result =
                    pluginManager.uploadAndLoad(
                            pluginsDir, inputStream, originalFilename, pluginContext);
            if (!result.isSuccess()) {
                throw new PluginFrameworkException(result.getErrorMessage());
            }
            PluginLoadResult loadResult = result.getLoadResult();
            if (loadResult.getLoadedPlugins().isEmpty()) {
                throw new PluginFrameworkException(
                        "插件上传成功但加载失败：未发现有效插件。请确认 jar 内存在 META-INF/plugin.properties"
                                + "（含 plugin.id、plugin.name、plugin.scan.packages），或提供"
                                + " META-INF/services/com.plugin.framework.core.spi.Plugin 并列出实现类。"
                                + "宿主需依赖 plugin-spring-spi 才能使用约定式加载。");
            }
            // 先取消被替换插件的 MVC 映射，再注册新加载的插件
            for (String pluginId : loadResult.getReplacedPluginIds()) {
                pluginSpringRegistrar.unregister(pluginId);
            }
            for (Plugin plugin : loadResult.getLoadedPlugins()) {
                pluginSpringRegistrar.register(plugin);
            }
            return loadResult;
        } catch (PluginFrameworkException e) {
            throw e;
        } catch (IOException e) {
            throw new PluginFrameworkException("读取上传文件失败: " + e.getMessage(), e);
        }
    }

    /**
     * 卸载指定 ID 的插件（从管理器移除并取消 Spring MVC 注册）。
     *
     * @param pluginId 插件唯一标识
     * @return 被卸载插件的元数据，便于调用方打日志或审计
     * @throws PluginArgumentException pluginId 为空时
     * @throws PluginFrameworkException 未找到该插件时
     */
    public PluginMetadata uninstall(String pluginId) {
        if (pluginId == null || pluginId.isEmpty()) {
            throw new PluginArgumentException("插件 ID 不能为空");
        }
        PluginMetadata metadata = pluginManager.getPluginMetadata().get(pluginId);
        if (metadata == null) {
            throw new PluginFrameworkException("未找到要卸载的插件: " + pluginId);
        }
        pluginManager.uninstallPlugin(pluginId);
        pluginSpringRegistrar.unregister(pluginId);
        return metadata;
    }

    /**
     * 停用指定 ID 的插件（释放句柄便于同 ID 再次上传覆盖），并持久化停用状态。
     *
     * @param pluginId 插件唯一标识
     * @return 被停用插件的元数据，便于调用方打日志或审计
     * @throws PluginArgumentException pluginId 为空时
     * @throws PluginFrameworkException 未找到该插件时
     */
    public PluginMetadata deactivate(String pluginId) {
        if (pluginId == null || pluginId.isEmpty()) {
            throw new PluginArgumentException("插件 ID 不能为空");
        }
        PluginMetadata metadata = pluginManager.getPluginMetadata().get(pluginId);
        if (metadata == null) {
            throw new PluginFrameworkException("未找到要停用的插件: " + pluginId);
        }
        pluginManager.deactivatePlugin(pluginId);
        pluginSpringRegistrar.unregister(pluginId);
        saveDisabledState();
        return metadata;
    }

    /**
     * 从 plugin-disabled.json 恢复停用记录（进程重启后仍能“上传同 ID 覆盖”）。应在展示插件列表前调用一次。
     * IO 失败时仅记录日志，不抛异常。
     */
    public void loadDisabledStateIfNeeded() {
        if (!pluginManager.getDisabledJarPaths().isEmpty()) {
            return;
        }
        Path pluginsDir = resolvePluginsDir();
        Path file = pluginsDir.resolve(DISABLED_STATE_FILE);
        if (!Files.isRegularFile(file)) {
            return;
        }
        try (InputStream in = Files.newInputStream(file)) {
            Map<String, Object> root = objectMapper.readValue(in, new TypeReference<>() {});
            @SuppressWarnings("unchecked")
            List<Map<String, String>> entries = (List<Map<String, String>>) root.get("entries");
            if (entries == null) {
                return;
            }
            Map<String, Path> map = new HashMap<>();
            for (Map<String, String> entry : entries) {
                String id = entry.get("pluginId");
                String fileName = entry.get("targetFileName");
                if (id != null && fileName != null) {
                    map.put(id, pluginsDir.resolve(fileName));
                }
            }
            pluginManager.setDisabledJarPaths(map);
        } catch (IOException e) {
            logger.log(
                    Level.WARNING,
                    "failed to load disabled state from {0}: {1}",
                    new Object[] {file, e.getMessage()});
        }
    }

    /** 将当前停用记录写入 plugin-disabled.json。IO 失败时仅记录日志，不抛异常。 */
    public void saveDisabledState() {
        try {
            Path pluginsDir = resolvePluginsDir();
            Files.createDirectories(pluginsDir);
            Map<String, Path> paths = pluginManager.getDisabledJarPaths();
            List<Map<String, String>> entries = new ArrayList<>();
            for (Map.Entry<String, Path> e : paths.entrySet()) {
                Map<String, String> entry = new HashMap<>();
                entry.put("pluginId", e.getKey());
                entry.put(
                        "targetFileName",
                        PluginManager.getDisabledJarRelativePath(e.getKey()));
                entries.add(entry);
            }
            Map<String, Object> root = new HashMap<>();
            root.put("entries", entries);
            Path file = pluginsDir.resolve(DISABLED_STATE_FILE);
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(file.toFile(), root);
        } catch (IOException e) {
            logger.log(
                    Level.WARNING,
                    "failed to save disabled state to {0}: {1}",
                    new Object[] {
                        resolvePluginsDir().resolve(DISABLED_STATE_FILE).toString(),
                        e.getMessage()
                    });
        }
    }

    private Path resolvePluginsDir() {
        return properties.resolvePluginsDir();
    }
}
