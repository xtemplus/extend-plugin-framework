package com.example.pluginframework.example.web;

import io.github.xtemplus.pluginframework.core.registry.ExtensionRegistry;
import io.github.xtemplus.pluginframework.core.runtime.PluginContext;
import io.github.xtemplus.pluginframework.core.spi.ExtensionPoint;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 主程序使用扩展点示例：根据用户是否 VIP 查询可用通道（如短信登录）。
 *
 * <p>主程序只按扩展点 ID + Map 约定调用，不依赖任何业务 SDK；插件在 onEnable 中向
 * {@link ExtensionRegistry} 注册扩展点，仅 VIP 时返回短信通道。
 */
@RestController
public class ChannelController {

    /** 扩展点 ID：用户可用通道（登录/通知等），约定入参含 isVip，出参含 channel、label。 */
    public static final String POINT_USER_CHANNEL_AVAILABLE = "user.channel.available";

    private final PluginContext pluginContext;

    public ChannelController(PluginContext pluginContext) {
        this.pluginContext = Objects.requireNonNull(pluginContext, "pluginContext");
    }

    /**
     * 查询当前用户可用的通道列表（如登录方式）。
     *
     * @param isVip 是否 VIP 用户，默认 false
     * @return 可用通道列表，每项含 channel、label 等
     */
    @GetMapping("/api/channels")
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> channels(
            @RequestParam(value = "isVip", defaultValue = "false") boolean isVip) {
        ExtensionRegistry registry = pluginContext.getExtensionRegistry();
        Map<String, Object> context = Map.of("isVip", isVip);
        List<ExtensionPoint<?, ?>> extensions =
                registry.getExtensions(POINT_USER_CHANNEL_AVAILABLE, context);
        if (extensions == null || extensions.isEmpty()) {
            return Collections.emptyList();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (ExtensionPoint<?, ?> ext : extensions) {
            try {
                ExtensionPoint<Object, Object> e = (ExtensionPoint<Object, Object>) ext;
                Object out = e.execute(context);
                if (out instanceof Map) {
                    result.add((Map<String, Object>) out);
                }
            } catch (Exception ignored) {
                // 单条扩展失败不影响其他
            }
        }
        return result;
    }
}
