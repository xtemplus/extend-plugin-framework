package com.example.pluginframework.api.extension;

/**
 * 宿主与插件共用的扩展点 ID 常量，避免字符串漂移。
 *
 * <p>插件 jar 与宿主均应在 classpath 上可见本模块（宿主直接依赖；插件建议 {@code provided}，由宿主提供）。
 */
public final class ChannelExtensionPoints {

    private ChannelExtensionPoints() {}

    /** 用户可用通道（登录/通知等）；上下文建议含 {@code isVip}，返回 Map 含 {@code channel}、{@code label} 等。 */
    public static final String USER_CHANNEL_AVAILABLE = "user.channel.available";
}
