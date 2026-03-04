package com.example.pluginframework.example.web;


import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plugin.framework.core.runtime.PluginContext;
import com.plugin.framework.core.runtime.PluginLoadResult;
import com.plugin.framework.core.runtime.PluginManager;
import com.plugin.framework.core.runtime.PluginMetadata;
import com.plugin.framework.core.spi.Plugin;
import com.plugin.framework.spring.PluginSpringRegistrar;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

/**
 * 简单的插件管理页面与上传接口，用于演示运行期导入插件 jar（热插拔加载）。
 */
@Controller
public class PluginAdminController {

    private static final String DISABLED_STATE_FILE = "plugin-disabled.json";

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final PluginManager pluginManager;

    private final PluginContext pluginContext;

    private final PluginSpringRegistrar pluginSpringRegistrar;

    public PluginAdminController(
            PluginManager pluginManager,
            PluginContext pluginContext,
            PluginSpringRegistrar pluginSpringRegistrar) {
        this.pluginManager = Objects.requireNonNull(pluginManager, "pluginManager");
        this.pluginContext = Objects.requireNonNull(pluginContext, "pluginContext");
        this.pluginSpringRegistrar =
                Objects.requireNonNull(pluginSpringRegistrar, "pluginSpringRegistrar");
    }

    /**
     * 返回一个非常简单的 HTML 页面，包含插件 jar 上传表单。
     *
     * @return HTML 内容
     */
    @GetMapping(value = {"/", "/plugins"}, produces = MediaType.TEXT_HTML_VALUE)
    public String pluginsPage(Model model) {
        Path pluginsDir = Paths.get(System.getProperty("user.dir"), "plugins");
        loadDisabledStateIfNeeded(pluginsDir);
        populateModel(model);
        return "plugins";
    }

    /**
     * 接收插件 jar 并立即加载，实现无需重启的热插拔加载。
     *
     * @param file  上传的插件 jar
     * @param model 视图模型
     * @return 视图名称
     * @throws IOException IO 错误
     */
    @PostMapping("/plugins/upload")
    public String uploadPlugin(
            @RequestParam("file") MultipartFile file, Model model)
            throws IOException {
        if (file.isEmpty()) {
            model.addAttribute("error", "插件文件不能为空");
            populateModel(model);
            return "plugins";
        }
        Path pluginsDir = Paths.get(System.getProperty("user.dir"), "plugins");
        Files.createDirectories(pluginsDir);
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.endsWith(".jar")) {
            model.addAttribute("error", "插件文件名不合法，必须为 .jar 结尾且遵循安全命名规范");
            populateModel(model);
            return "plugins";
        }
        Path tempTarget =
                pluginsDir.resolve("upload-" + System.currentTimeMillis() + ".jar");
        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, tempTarget, StandardCopyOption.REPLACE_EXISTING);
        }
        PluginMetadata newMetadata = pluginManager.loadMetadataFromJar(tempTarget);
        if (newMetadata == null || !newMetadata.hasValidId()) {
            Files.deleteIfExists(tempTarget);
            model.addAttribute(
                    "error",
                    "无法读取插件元数据（META-INF/plugin.properties 或 plugin.id 无效）。");
            populateModel(model);
            return "plugins";
        }
        String newPluginId = newMetadata.getId();
        if (pluginManager.getPluginMetadata().containsKey(newPluginId)) {
            Files.deleteIfExists(tempTarget);
            model.addAttribute(
                    "error",
                    "已存在同 ID 的已加载插件（" + newPluginId + "）。请先停用该插件后再上传新版本。");
            populateModel(model);
            return "plugins";
        }
        Path target;
        if (pluginManager.getDisabledJarPath(newPluginId).isPresent()) {
            target = pluginManager.getDisabledJarPath(newPluginId).get();
            Files.move(tempTarget, target, StandardCopyOption.REPLACE_EXISTING);
            Path activePath = pluginsDir.resolve(PluginManager.getActiveJarFileName(newPluginId));
            try {
                Files.move(target, activePath, StandardCopyOption.REPLACE_EXISTING);
                target = activePath;
            } catch (IOException e) {
                // 原 plugins/ 下文件仍被占用时，直接从 disabled 路径加载
            }
            pluginManager.clearDisabledEntry(newPluginId);
            saveDisabledState(pluginsDir);
        } else {
            target = pluginsDir.resolve(PluginManager.getActiveJarFileName(newPluginId));
            Files.move(tempTarget, target, StandardCopyOption.REPLACE_EXISTING);
        }
        PluginLoadResult result = pluginManager.loadPlugin(target, pluginContext);
        for (String pluginId : result.getReplacedPluginIds()) {
            pluginSpringRegistrar.unregister(pluginId);
        }
        for (Plugin plugin : result.getLoadedPlugins()) {
            pluginSpringRegistrar.register(plugin);
        }
        if (result.getLoadedPlugins().isEmpty()) {
            model.addAttribute(
                    "error",
                    "插件上传成功但加载失败：未发现有效插件。请确认 jar 内存在 META-INF/plugin.properties（含 plugin.id、plugin.name、plugin.scan.packages），"
                            + "或提供 META-INF/services/com.plugin.framework.core.spi.Plugin 并列出实现类。宿主需依赖 plugin-spring-spi 才能使用约定式加载。");
        } else {
            model.addAttribute(
                    "message", "插件上传并加载成功: " + target.getFileName());
        }
        populateModel(model);
        return "plugins";
    }

    /**
     * 卸载指定 ID 的插件。
     *
     * @param pluginId 插件唯一标识
     * @param model    视图模型
     * @return 视图名称
     */
    @PostMapping("/plugins/uninstall")
    public String uninstallPlugin(
            @RequestParam("pluginId") String pluginId, Model model) {
        if (pluginId == null || pluginId.isEmpty()) {
            model.addAttribute("error", "插件 ID 不能为空");
        } else if (pluginManager.uninstallPlugin(pluginId)) {
            pluginSpringRegistrar.unregister(pluginId);
            model.addAttribute("message", "插件卸载成功: " + pluginId);
        } else {
            model.addAttribute("error", "未找到要卸载的插件: " + pluginId);
        }
        populateModel(model);
        return "plugins";
    }

    /**
     * 停用指定 ID 的插件，释放 jar 文件句柄，便于再次上传同 ID 时覆盖原文件。
     *
     * @param pluginId 插件唯一标识
     * @param model   视图模型
     * @return 视图名称
     */
    @PostMapping("/plugins/deactivate")
    public String deactivatePlugin(
            @RequestParam("pluginId") String pluginId, Model model) {
        if (pluginId == null || pluginId.isEmpty()) {
            model.addAttribute("error", "插件 ID 不能为空");
        } else if (pluginManager.deactivatePlugin(pluginId)) {
            pluginSpringRegistrar.unregister(pluginId);
            Path pluginsDir = Paths.get(System.getProperty("user.dir"), "plugins");
            saveDisabledState(pluginsDir);
            model.addAttribute("message", "插件已停用: " + pluginId + "，可上传同 ID 新版本覆盖。");
        } else {
            model.addAttribute("error", "未找到要停用的插件: " + pluginId);
        }
        populateModel(model);
        return "plugins";
    }

    private void populateModel(Model model) {
        model.addAttribute("plugins", pluginManager.getPlugins());
        Map<String, PluginMetadata> metadata = pluginManager.getPluginMetadata();
        model.addAttribute("pluginMetadata", metadata);
        Map<String, Path> disabledPaths = pluginManager.getDisabledJarPaths();
        Map<String, String> disabledPlugins = new HashMap<>();
        for (Map.Entry<String, Path> e : disabledPaths.entrySet()) {
            disabledPlugins.put(e.getKey(), e.getValue().getFileName().toString());
        }
        model.addAttribute("disabledPlugins", disabledPlugins);
    }

    /**
     * 从 plugin-disabled.json 恢复停用记录（进程重启后仍能“上传同 ID 覆盖”）。
     */
    private void loadDisabledStateIfNeeded(Path pluginsDir) {
        if (!pluginManager.getDisabledJarPaths().isEmpty()) {
            return;
        }
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
            // ignore
        }
    }

    private void saveDisabledState(Path pluginsDir) {
        try {
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
            // ignore
        }
    }
}

