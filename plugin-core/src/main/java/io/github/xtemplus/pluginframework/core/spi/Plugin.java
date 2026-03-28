package io.github.xtemplus.pluginframework.core.spi;

import io.github.xtemplus.pluginframework.core.runtime.PluginContext;

/**
 * 插件 SPI 接口；{@link #onEnable}、{@link #onDisable} 默认为空操作，有注册扩展或释放资源等需求时再重写。
 *
 * <p>{@link #getId()}、{@link #getName()} 提供默认实现：分别为实现类的全限定名与简单类名（简单名为空时回落为全限定名，以覆盖匿名类等情形）。若 jar 内
 * {@code META-INF/plugin.properties} 声明了 {@code plugin.id}，其值须与 {@link #getId()} 一致，否则 {@code
 * PluginManager} 会因 ID 不匹配跳过加载。需要稳定对外 ID 或展示名时可继续重写这两个方法，或沿用 Spring 侧 {@code
 * AbstractSpringPlugin} 从属性文件读取的约定。
 */
public interface Plugin {

    /**
     * 插件唯一标识；默认为当前实现类的全限定名（{@code getClass().getName()}）。
     *
     * @return 插件 ID
     */
    default String getId() {
        return getClass().getName();
    }

    /**
     * 插件名称；默认为当前实现类的简单类名（{@code getClass().getSimpleName()}），空则回落为全限定名。
     *
     * @return 插件名称
     */
    default String getName() {
        Class<?> c = getClass();
        String simple = c.getSimpleName();
        return simple.isEmpty() ? c.getName() : simple;
    }

    /**
     * 插件启用回调；默认无操作。
     *
     * @param context 插件上下文
     */
    default void onEnable(PluginContext context) {}

    /**
     * 插件禁用回调；默认无操作。
     */
    default void onDisable() {}
}

