package com.example.pluginframework.sms;

import com.example.pluginframework.api.extension.ChannelExtensionPoints;
import io.github.xtemplus.pluginframework.core.runtime.PluginContext;
import io.github.xtemplus.pluginframework.core.spi.ExtPoint;
import io.github.xtemplus.pluginframework.core.spi.ExtRunCondition;
import io.github.xtemplus.pluginframework.core.spi.Plugin;
import java.util.HashMap;
import java.util.Map;

/**
 * 短信通道插件：在扩展点 {@link ChannelExtensionPoints#USER_CHANNEL_AVAILABLE} 上注册条目，仅当上下文 {@code
 * isVip} 为 true 时由 {@link ExtPoint} 标注的方法返回通道描述。
 *
 * <p>在 {@link io.github.xtemplus.pluginframework.core.runtime.PluginManager} 加载场景下可使用单参数 {@link
 * PluginContext#registerMapExtensionMethods(Object)}，无需再传
 * {@code pluginId}。
 */
public class SmsChannelPlugin implements Plugin {

    @Override
    public void onEnable(PluginContext context) {
        context.registerMapExtensionMethods(this);
    }

    @ExtRunCondition(ChannelExtensionPoints.USER_CHANNEL_AVAILABLE)
    boolean onlyVip(Map<String, Object> context) {
        if (context == null) {
            return false;
        }
        return Boolean.TRUE.equals(context.get("isVip"));
    }

    @ExtPoint(ChannelExtensionPoints.USER_CHANNEL_AVAILABLE)
    Map<String, Object> channel(Map<String, Object> context) {
        Map<String, Object> m = new HashMap<>();
        m.put("channel", "sms");
        m.put("label", "短信登录");
        m.put("description", "VIP 用户可用");
        return m;
    }

    @ExtPoint(value = ChannelExtensionPoints.USER_CHANNEL_AVAILABLE,order = 1)
    Map<String, Object> channel2(Map<String, Object> context) {
        Map<String, Object> m = new HashMap<>();
        m.put("channel", "sms333");
        m.put("label", "短信登录3232323");
        m.put("description", "VI2323P 用2323户可用");
        return m;
    }
}
