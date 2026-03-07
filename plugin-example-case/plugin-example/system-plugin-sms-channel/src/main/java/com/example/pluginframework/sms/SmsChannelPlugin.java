package com.example.pluginframework.sms;

import com.plugin.framework.core.registry.ExtensionRegistry;
import com.plugin.framework.core.runtime.PluginContext;
import com.plugin.framework.core.spi.ExtensionPoint;
import com.plugin.framework.core.spi.Plugin;
import com.plugin.framework.core.spi.PluginEndpoint;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * 短信通道插件：通过扩展点 {@code user.channel.available} 注册，仅当用户为 VIP 时展示短信通道。
 *
 * <p>主程序不依赖任何 SDK 接口，仅调用 {@link ExtensionRegistry#getExtensions(String, Object)} 并传入
 * Map（含 isVip）；本插件实现 {@link ExtensionPoint}{@code <Map, Map>}，在 supports 中判断 isVip，
 * execute 返回 {@code {channel:"sms", label:"短信登录"}}。
 */
public final class SmsChannelPlugin implements Plugin {

    private static final String POINT_ID = "user.channel.available";

    private final ExtensionPoint<Map<String, Object>, Map<String, Object>> smsChannelExtension =
            new ExtensionPoint<Map<String, Object>, Map<String, Object>>() {
                @Override
                public String getPointId() {
                    return POINT_ID;
                }

                @Override
                public boolean supports(Map<String, Object> context) {
                    Object isVip = context != null ? context.get("isVip") : null;
                    return Boolean.TRUE.equals(isVip);
                }

                @Override
                public Map<String, Object> execute(Map<String, Object> context) {
                    return Map.of(
                            "channel", "sms",
                            "label", "短信登录",
                            "description", "VIP 用户可用");
                }
            };

    @Override
    public String getId() {
        return "com.plugin.framework.sms.channel";
    }

    @Override
    public String getName() {
        return "SMS-Channel-Plugin";
    }

    @Override
    public void onEnable(PluginContext context) {
        ExtensionRegistry registry = context.getExtensionRegistry();
        registry.register(smsChannelExtension);
    }

    @Override
    public void onDisable() {
        // 扩展点由注册表持有，插件卸载后不再被调用即可
    }

    @Override
    public List<PluginEndpoint> getEndpoints() {
        return Collections.emptyList();
    }
}
