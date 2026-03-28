package com.example.pluginframework.example.web;

import io.github.extend.plugin.core.runtime.PluginLoadResult;
import io.github.extend.plugin.core.runtime.PluginManager;
import io.github.extend.plugin.core.runtime.PluginMetadata;
import io.github.extend.plugin.spring.exception.PluginFrameworkException;
import io.github.extend.plugin.spring.manager.SpringPluginManager;
import java.nio.file.Path;
import java.util.HashMap;
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
 *
 * <p>上传、卸载、停用逻辑已下沉至 {@link SpringPluginManager}，本 Controller 仅负责请求与视图。
 */
@Controller
public class PluginAdminController {

    private final PluginManager pluginManager;
    private final SpringPluginManager springPluginManager;

    public PluginAdminController(
            PluginManager pluginManager,
            SpringPluginManager springPluginManager) {
        this.pluginManager = Objects.requireNonNull(pluginManager, "pluginManager");
        this.springPluginManager =
                Objects.requireNonNull(springPluginManager, "springPluginManager");
    }

    /**
     * 返回插件管理 HTML 页面，包含插件 jar 上传表单。
     *
     * @param model 视图模型
     * @return 视图名称
     */
    @GetMapping(value = {"/", "/plugins"}, produces = MediaType.TEXT_HTML_VALUE)
    public String pluginsPage(Model model) {
        springPluginManager.loadDisabledStateIfNeeded();
        populateModel(model);
        return "plugins";
    }

    /**
     * 接收插件 jar 并立即加载、注册，实现无需重启的热插拔加载。
     *
     * @param file  上传的插件 jar
     * @param model 视图模型
     * @return 视图名称
     */
    @PostMapping("/plugins/upload")
    public String uploadPlugin(
            @RequestParam("file") MultipartFile file, Model model) {
        try {
            PluginLoadResult result = springPluginManager.uploadAndRegister(file);
            String names =
                    result.getLoadedPlugins().stream()
                            .map(p -> p.getName() != null ? p.getName() : p.getId())
                            .reduce((a, b) -> a + ", " + b)
                            .orElse(file.getOriginalFilename());
            model.addAttribute("message", "插件上传并加载成功: " + names);
        } catch (PluginFrameworkException e) {
            model.addAttribute("error", e.getMessage());
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
        try {
            PluginMetadata metadata = springPluginManager.uninstall(pluginId);
            model.addAttribute("message", "插件卸载成功: " + metadata.getName() + " (" + pluginId + ")");
        } catch (PluginFrameworkException e) {
            model.addAttribute("error", e.getMessage());
        }
        populateModel(model);
        return "plugins";
    }

    /**
     * 停用指定 ID 的插件，释放 jar 文件句柄，便于再次上传同 ID 时覆盖原文件。
     *
     * @param pluginId 插件唯一标识
     * @param model    视图模型
     * @return 视图名称
     */
    @PostMapping("/plugins/deactivate")
    public String deactivatePlugin(
            @RequestParam("pluginId") String pluginId, Model model) {
        try {
            PluginMetadata metadata = springPluginManager.deactivate(pluginId);
            model.addAttribute(
                    "message",
                    "插件已停用: " + metadata.getName() + " (" + pluginId + ")，可上传同 ID 新版本覆盖。");
        } catch (PluginFrameworkException e) {
            model.addAttribute("error", e.getMessage());
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
}
