package com.plugin.framework.spring;

import com.plugin.framework.core.runtime.PluginContext;
import com.plugin.framework.core.spi.Plugin;
import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/**
 * Spring 插件的抽象基类：从 {@code META-INF/plugin.properties} 读取 id/name，默认以入口类所在包为
 * Spring 扫描根包，子类只需实现 {@link #onEnable(PluginContext)}。
 *
 * <p>使用方式：插件入口类继承本类，并保证 jar 内存在 {@code META-INF/plugin.properties}（至少
 * plugin.id、plugin.name）。无需再手写 PLUGIN_ID、PLUGIN_NAME、BASE_PACKAGES 等常量。
 */
public abstract class AbstractSpringPlugin implements Plugin, SpringPlugin {

    private final String id;
    private final String name;

    /**
     * 子类构造时从 META-INF/plugin.properties 读取 plugin.id、plugin.name。
     *
     * @throws IllegalStateException 无法加载或缺少 plugin.id 时
     */
    protected AbstractSpringPlugin() {
        Properties properties = new Properties();
        try (InputStream in =
                getClass().getClassLoader().getResourceAsStream("META-INF/plugin.properties")) {
            if (in != null) {
                properties.load(in);
            }
        } catch (IOException e) {
            throw new IllegalStateException("加载 META-INF/plugin.properties 失败", e);
        }
        String propId = properties.getProperty("plugin.id");
        String propName = properties.getProperty("plugin.name");
        this.id = propId != null && !propId.isEmpty() ? propId : getClass().getName();
        this.name = propName != null && !propName.isEmpty() ? propName : getClass().getSimpleName();
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public void onDisable() {
        // 默认空实现，子类按需覆盖
    }

    @Override
    public String[] getBasePackages() {
        return new String[] {getClass().getPackageName()};
    }

    @Override
    public abstract void onEnable(PluginContext context);
}
