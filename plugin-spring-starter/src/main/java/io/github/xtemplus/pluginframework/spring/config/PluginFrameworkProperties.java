package io.github.xtemplus.pluginframework.spring.config;

import java.nio.file.Path;
import java.nio.file.Paths;
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

    /** 插件目录：相对路径时相对 user.dir，绝对路径时直接使用（Unix 以 / 开头，Windows 可含盘符如 C:）。 */
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

    /**
     * 运行模式：DEV 模式下推荐通过模块依赖直接在宿主中调试插件，不依赖 JAR 上传；DEPLOYMENT 模式下从
     * plugins 目录加载已打包的 JAR 并支持运行期上传。
     */
    public enum RuntimeMode {
        DEV,
        DEPLOYMENT
    }

    /** 运行模式，默认 DEPLOYMENT。 */
    private RuntimeMode runtimeMode = RuntimeMode.DEPLOYMENT;

    /**
     * DEV 模式下用于本地调试的 classes 目录列表（可选），例如：
     *
     * <pre>
     * plugin:
     *   framework:
     *     runtime-mode: DEV
     *     dev-classes-dirs:
     *       - ../plugin-example-case/plugin-example/system-plugin-demo-test1/target/classes
     * </pre>
     *
     * 当不配置或列表为空时，DEV 模式仅关闭启动时从 plugins 目录加载与上传接口，插件以普通模块依赖方式参与宿主启动。
     */
    private String[] devClassesDirs;

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

    public RuntimeMode getRuntimeMode() {
        return runtimeMode;
    }

    public void setRuntimeMode(RuntimeMode runtimeMode) {
        this.runtimeMode = runtimeMode;
    }

    public String[] getDevClassesDirs() {
        return devClassesDirs == null ? null : devClassesDirs.clone();
    }

    public void setDevClassesDirs(String[] devClassesDirs) {
        this.devClassesDirs = devClassesDirs == null ? null : devClassesDirs.clone();
    }

    /**
     * 解析插件目录路径：若 {@link #getPluginsDir()} 为绝对路径则直接使用，否则相对 user.dir 解析。
     *
     * @return 插件目录的绝对路径
     */
    public Path resolvePluginsDir() {
        Path path = Paths.get(pluginsDir);
        if (path.isAbsolute()) {
            return path;
        }
        return Paths.get(System.getProperty("user.dir")).resolve(pluginsDir);
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
