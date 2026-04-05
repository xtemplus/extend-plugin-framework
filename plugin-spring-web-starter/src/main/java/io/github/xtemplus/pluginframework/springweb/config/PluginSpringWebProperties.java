package io.github.xtemplus.pluginframework.springweb.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * {@code plugin-spring-web-starter} 的可选配置（与 {@link PluginSpringWebAutoConfiguration} 中占位符一致）。
 */
@ConfigurationProperties(prefix = "plugin.spring.web")
public class PluginSpringWebProperties {

    /** 扫描并注册 plugin-web-starter Bean 的基础包；默认见 {@link PluginSpringWebSupport#DEFAULT_SCAN_BASE_PACKAGE}。 */
    private String scanBasePackages = PluginSpringWebSupport.DEFAULT_SCAN_BASE_PACKAGE;

    public String getScanBasePackages() {
        return scanBasePackages;
    }

    public void setScanBasePackages(String scanBasePackages) {
        this.scanBasePackages = scanBasePackages;
    }
}
