package com.example.pluginframework.example.web;

import com.example.pluginframework.api.extension.ChannelExtensionPoints;
import io.github.xtemplus.pluginframework.core.registry.ExtensionRegistry;
import io.github.xtemplus.pluginframework.core.runtime.PluginContext;
import io.github.xtemplus.pluginframework.core.spi.ExtensionPoint;
import io.github.xtemplus.pluginframework.core.support.ExtensionFailurePolicy;
import io.github.xtemplus.pluginframework.core.support.TypeReference;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 主程序使用扩展点示例：根据用户是否 VIP 查询可用通道（如短信登录）。
 *
 * <p>下方列出常见调用方式（{@code ExtensionRegistry registry = pluginContext.getExtensionRegistry()}；{@code
 * String pointId = ChannelExtensionPoints.USER_CHANNEL_AVAILABLE}；{@code Map<String, Object> context = …}）。
 *
 * <h2>1. 批量 + {@link TypeReference}（推荐，列表元素类型为 {@code Map<String, Object>}）</h2>
 *
 * <pre>{@code
 * List<Map<String, Object>> rows = registry.executeAll(
 *         pointId,
 *         context,
 *         new TypeReference<Map<String, Object>>() {},
 *         ExtensionFailurePolicy.SKIP_ON_FAILURE);
 * }</pre>
 *
 * <h2>2. 批量 + {@code executeAllMaps}（专用于 Map，等价于上面一种）</h2>
 *
 * <pre>{@code
 * List<Map<String, Object>> rows = registry.executeAllMaps(pointId, context, ExtensionFailurePolicy.SKIP_ON_FAILURE);
 * }</pre>
 *
 * <h2>3. 只传 pointId / context，元素为 {@link Object}（需自行判断 / 强转）</h2>
 *
 * <pre>{@code
 * List<Object> raw = registry.executeAll(pointId, context, ExtensionFailurePolicy.SKIP_ON_FAILURE);
 * for (Object o : raw) {
 *     if (o instanceof Map) {
 *         Map<?, ?> m = (Map<?, ?>) o;
 *         // ...
 *     }
 * }
 * }</pre>
 *
 * <h2>4. 只传 pointId / context，默认 FAIL_FAST</h2>
 *
 * <pre>{@code
 * List<Object> raw = registry.executeAll(pointId, context);
 * Optional<Object> first = registry.executeFirst(pointId, context);
 * }</pre>
 *
 * <h2>5. 首个扩展 + 明确 {@link Class}</h2>
 *
 * <pre>{@code
 * Optional<Map> asMap = registry.executeFirst(pointId, context, Map.class, ExtensionFailurePolicy.FAIL_FAST);
 * }</pre>
 *
 * <h2>6. 通过 {@link PluginContext} 委托（少写 {@code getExtensionRegistry()}）</h2>
 *
 * <pre>{@code
 * pluginContext.executeAllExtensions(pointId, context, new TypeReference<Map<String, Object>>() {}, policy);
 * pluginContext.executeAllExtensions(pointId, context, policy); // List<Object>
 * pluginContext.executeFirstExtension(pointId, context, Map.class); // Optional<Map>
 * }</pre>
 *
 * <h2>7. 仅排序后自行遍历（需逐条日志或特殊逻辑时）</h2>
 *
 * <pre>{@code
 * List<ExtensionPoint<?, ?>> ordered = registry.orderedExtensions(pointId, context);
 * for (ExtensionPoint<?, ?> ext : ordered) {
 *     ExtensionPoint<Object, Object> e = (ExtensionPoint<Object, Object>) ext;
 *     Object out = e.execute(context);
 * }
 * }</pre>
 */
@RestController
public class ChannelController {

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
    public List<Map<String, Object>> channels(
            @RequestParam(value = "isVip", defaultValue = "false") boolean isVip) {
        ExtensionRegistry registry = pluginContext.getExtensionRegistry();
        Map<String, Object> context = new HashMap<>();
        context.put("isVip", isVip);
        String pointId = ChannelExtensionPoints.USER_CHANNEL_AVAILABLE;
        return registry.executeAll(
                pointId,
                context,
                new TypeReference<Map<String, Object>>() {},
                ExtensionFailurePolicy.SKIP_ON_FAILURE);
    }
}
