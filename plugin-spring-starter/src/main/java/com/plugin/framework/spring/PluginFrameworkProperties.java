package com.plugin.framework.spring;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 插件框架的配置属性，前缀为 {@code plugin.framework}。
 *
 * <p>宿主可通过 application.yml 或环境变量覆盖；安全密钥优先从环境变量 {@link #getSecurityEnvKey()} 读取。
 */
@ConfigurationProperties(prefix = "plugin.framework")
public class PluginFrameworkProperties {

    /** 宿主应用标识，用于区分不同宿主环境。 */
    private String hostId = "example-host";

    /** 插件目录，相对于 user.dir。 */
    private String pluginsDir = "plugins";

    /** 是否在应用启动时自动扫描并加载插件。 */
    private boolean autoLoadOnStartup = true;

    /** 从环境变量读取安全密钥时使用的 key。 */
    private String securityEnvKey = "PLUGIN_SECURITY_SECRET";

    /** 环境变量未配置时使用的默认安全密钥。 */
    private String defaultSecuritySecret = "change-me-default-secret";

    /** 安全 token 最小长度（nonce 等）。 */
    private int securityTokenMinLength = 8;

    /** 安全 token 最大长度。 */
    private int securityTokenMaxLength = 24;

    /** 是否在插件加载完成后打印启动 Banner。 */
    private boolean bannerEnabled = true;

    public String getHostId() {
        return hostId;
    }

    public void setHostId(String hostId) {
        this.hostId = hostId;
    }

    public String getPluginsDir() {
        return pluginsDir;
    }

    public void setPluginsDir(String pluginsDir) {
        this.pluginsDir = pluginsDir;
    }

    public boolean isAutoLoadOnStartup() {
        return autoLoadOnStartup;
    }

    public void setAutoLoadOnStartup(boolean autoLoadOnStartup) {
        this.autoLoadOnStartup = autoLoadOnStartup;
    }

    public String getSecurityEnvKey() {
        return securityEnvKey;
    }

    public void setSecurityEnvKey(String securityEnvKey) {
        this.securityEnvKey = securityEnvKey;
    }

    public String getDefaultSecuritySecret() {
        return defaultSecuritySecret;
    }

    public void setDefaultSecuritySecret(String defaultSecuritySecret) {
        this.defaultSecuritySecret = defaultSecuritySecret;
    }

    public int getSecurityTokenMinLength() {
        return securityTokenMinLength;
    }

    public void setSecurityTokenMinLength(int securityTokenMinLength) {
        this.securityTokenMinLength = securityTokenMinLength;
    }

    public int getSecurityTokenMaxLength() {
        return securityTokenMaxLength;
    }

    public void setSecurityTokenMaxLength(int securityTokenMaxLength) {
        this.securityTokenMaxLength = securityTokenMaxLength;
    }

    public boolean isBannerEnabled() {
        return bannerEnabled;
    }

    public void setBannerEnabled(boolean bannerEnabled) {
        this.bannerEnabled = bannerEnabled;
    }

    /**
     * 从环境变量解析安全密钥，若未配置则返回默认值。
     *
     * @return 安全密钥
     */
    public String resolveSecret() {
        String value = System.getenv(securityEnvKey);
        if (value == null || value.isEmpty()) {
            return defaultSecuritySecret;
        }
        return value;
    }
}

