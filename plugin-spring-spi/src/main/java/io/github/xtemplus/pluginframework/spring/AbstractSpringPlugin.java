package io.github.xtemplus.pluginframework.spring;

import io.github.xtemplus.pluginframework.core.common.PluginConstants;
import io.github.xtemplus.pluginframework.core.runtime.PluginContext;
import io.github.xtemplus.pluginframework.core.spi.Plugin;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

/**
 * Spring 插件的抽象基类：从 {@code META-INF/plugin.properties} 读取 id/name，默认以入口类所在包为
 * Spring 扫描根包；若配置了 plugin.scan.packages 则优先使用。子类只需实现 {@link #onEnable(PluginContext)}。
 *
 * <p>使用方式：插件入口类继承本类，并保证 jar 内存在 {@code META-INF/plugin.properties}（至少
 * plugin.id、plugin.name）。plugin.scan.packages 可选，不配置时使用入口类所在包。
 */
public abstract class AbstractSpringPlugin implements Plugin, SpringPlugin {

    private final String id;
    private final String name;
    /** 若 plugin.properties 中配置了 plugin.scan.packages 则使用，否则用入口类所在包。 */
    private final String[] basePackages;

    /**
     * 子类构造时从 META-INF/plugin.properties 读取 plugin.id、plugin.name、plugin.scan.packages。
     *
     * @throws IllegalStateException 无法加载或缺少 plugin.id 时
     */
    protected AbstractSpringPlugin() {
        Properties properties = new Properties();
        try (InputStream in =
                getClass().getClassLoader().getResourceAsStream(PluginConstants.METADATA_PATH)) {
            if (in != null) {
                properties.load(in);
            }
        } catch (IOException e) {
            throw new IllegalStateException("加载 " + PluginConstants.METADATA_PATH + " 失败", e);
        }
        String propId = properties.getProperty("plugin.id");
        String propName = properties.getProperty("plugin.name");
        this.id = propId != null && !propId.isEmpty() ? propId : getClass().getName();
        this.name = propName != null && !propName.isEmpty() ? propName : getClass().getSimpleName();
        this.basePackages = parseBasePackages(properties.getProperty("plugin.scan.packages"));
    }

    private static String[] parseBasePackages(String value) {
        if (value == null || value.isEmpty()) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        List<String> list = new ArrayList<>();
        for (String part : trimmed.split(PluginConstants.DELIMITER_COMMA)) {
            String p = part.trim();
            if (!p.isEmpty()) {
                list.add(p);
            }
        }
        return list.isEmpty() ? null : list.toArray(new String[0]);
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
        if (basePackages != null && basePackages.length > 0) {
            return basePackages.clone();
        }
        return new String[] {getClass().getPackageName()};
    }

    @Override
    public abstract void onEnable(PluginContext context);
}
