package io.github.xtemplus.webplugin.config;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Registered as a Spring bean via {@link Component} so a host application only needs
 * {@code @ComponentScan("io.github.xtemplus.webplugin")} (no separate {@code @ConfigurationPropertiesScan}
 * required for this type).
 */
@Component
@ConfigurationProperties(prefix = "web-plugin")
public class WebPluginProperties implements InitializingBean {

    /** Directory (relative to JVM working directory unless absolute) containing one subfolder per plugin. */
    private String webPluginsDir = "plugin-example-case/plugins/web";

    /**
     * When {@link #webPluginsDir} is blank before binding (edge case), path resolver uses this relative
     * path; also used as fallback inside {@link WebPluginsPathResolver}.
     */
    private String webPluginsDirResolutionFallback = "plugin-example-case/plugins/web";

    /** HTTP path prefix for published plugin bundles (no trailing slash), e.g. {@code /plugins/web}. */
    private String pluginsWebPathPrefix = "/plugins/web";

    /** Relative paths (from a candidate base such as {@code user.dir}) tried in order when locating the
     * plugins root; host projects can prepend their own layout. */
    private List<String> pathResolutionCandidateRelativePaths =
            new ArrayList<>(
                    Arrays.asList("plugin-example-case/plugins/web", "plugins/web"));

    /** Manifest file name inside each plugin directory. */
    private String manifestFileName = "manifest.json";

    /** File name under {@code main-app-plugins-subdir} for disabled backend plugin ids. */
    private String disabledStateFileName = "plugin-disabled.json";

    /** GET path for the plugin list JSON API. */
    private String listPluginsApiPath = "/api/web-plugins";

    /** Value returned as {@code hostPluginApiVersion} in API responses. */
    private String hostPluginApiVersion = "1.0.0";

    /** If non-empty, used as prefix for entryUrl instead of inferring from HTTP request. */
    private String publicBaseUrl = "";

    /**
     * Hosts allowed in generated absolute {@code http}/{@code https} URLs for <strong>both</strong> entry
     * scripts and stylesheets (exact host match, case-insensitive). YAML key remains {@code
     * entry-url-host-allowlist} for backward compatibility.
     */
    private List<String> entryUrlHostAllowlist = new ArrayList<>();

    private int maxPlugins = 50;

    private int maxPluginsMin = 1;

    private int maxPluginsMax = 10_000;

    /** Optional: main app working directory to read disabled-state file. */
    private String mainAppWorkdir = "";

    private String mainAppPluginsSubdir = "plugins";

    /** CORS {@code allowedOrigins} for the list API (e.g. {@code *} or {@code https://host}). */
    private List<String> corsAllowedOrigins = new ArrayList<>(Collections.singletonList("*"));

    @Override
    public void afterPropertiesSet() {
        validate();
    }

    public void validate() {
        if (webPluginsDir == null || webPluginsDir.trim().isEmpty()) {
            throw new IllegalStateException("web-plugin.web-plugins-dir must not be blank");
        }
        if (webPluginsDirResolutionFallback == null || webPluginsDirResolutionFallback.trim().isEmpty()) {
            throw new IllegalStateException("web-plugin.web-plugins-dir-resolution-fallback must not be blank");
        }
        if (pluginsWebPathPrefix == null || pluginsWebPathPrefix.trim().isEmpty()) {
            throw new IllegalStateException("web-plugin.plugins-web-path-prefix must not be blank");
        }
        if (manifestFileName == null
                || manifestFileName.trim().isEmpty()
                || manifestFileName.contains("/")
                || manifestFileName.contains("\\")) {
            throw new IllegalStateException(
                    "web-plugin.manifest-file-name must be a simple file name without path separators");
        }
        if (disabledStateFileName == null
                || disabledStateFileName.trim().isEmpty()
                || disabledStateFileName.contains("/")
                || disabledStateFileName.contains("\\")) {
            throw new IllegalStateException(
                    "web-plugin.disabled-state-file-name must be a simple file name without path separators");
        }
        if (listPluginsApiPath == null || listPluginsApiPath.trim().isEmpty() || !listPluginsApiPath.trim().startsWith("/")) {
            throw new IllegalStateException(
                    "web-plugin.list-plugins-api-path must be non-blank and start with '/'");
        }
        if (hostPluginApiVersion == null || hostPluginApiVersion.trim().isEmpty()) {
            throw new IllegalStateException("web-plugin.host-plugin-api-version must not be blank");
        }
        if (mainAppPluginsSubdir == null || mainAppPluginsSubdir.trim().isEmpty()) {
            throw new IllegalStateException("web-plugin.main-app-plugins-subdir must not be blank");
        }
        if (maxPluginsMin >= maxPluginsMax) {
            throw new IllegalStateException(
                    "web-plugin.max-plugins-min must be less than web-plugin.max-plugins-max");
        }
        if (maxPlugins < maxPluginsMin || maxPlugins > maxPluginsMax) {
            throw new IllegalStateException(
                    "web-plugin.max-plugins must be between "
                            + maxPluginsMin
                            + " and "
                            + maxPluginsMax
                            + ", got: "
                            + maxPlugins);
        }
        if (pathResolutionCandidateRelativePaths == null || pathResolutionCandidateRelativePaths.isEmpty()) {
            throw new IllegalStateException(
                    "web-plugin.path-resolution-candidate-relative-paths must not be empty");
        }
        for (String rel : pathResolutionCandidateRelativePaths) {
            if (rel == null || rel.trim().isEmpty()) {
                throw new IllegalStateException(
                        "web-plugin.path-resolution-candidate-relative-paths must not contain blank entries");
            }
            String t = rel.trim();
            if (t.startsWith("/") || t.startsWith("\\")) {
                throw new IllegalStateException(
                        "web-plugin.path-resolution-candidate-relative-paths entries must be relative: "
                                + rel);
            }
        }
        if (corsAllowedOrigins == null || corsAllowedOrigins.isEmpty()) {
            throw new IllegalStateException("web-plugin.cors-allowed-origins must not be empty");
        }
    }

    /** Prefix with leading and trailing {@code /} for joining {@code dir/file}. */
    public String getPluginsWebUrlPathPrefixWithSlashes() {
        String p = pluginsWebPathPrefixWithLeadingSlash();
        if (!p.endsWith("/")) {
            p = p + "/";
        }
        return p;
    }

    /** Spring MVC resource pattern, e.g. {@code /plugins/web/**}. */
    public String getPluginsWebResourceHandlerPattern() {
        String p = pluginsWebPathPrefixWithLeadingSlash();
        while (p.endsWith("/")) {
            p = p.substring(0, p.length() - 1);
        }
        return p + "/**";
    }

    private String pluginsWebPathPrefixWithLeadingSlash() {
        String p = pluginsWebPathPrefix.trim();
        return p.startsWith("/") ? p : "/" + p;
    }

    public String getWebPluginsDir() {
        return webPluginsDir;
    }

    public void setWebPluginsDir(String webPluginsDir) {
        this.webPluginsDir = webPluginsDir;
    }

    public String getWebPluginsDirResolutionFallback() {
        return webPluginsDirResolutionFallback;
    }

    public void setWebPluginsDirResolutionFallback(String webPluginsDirResolutionFallback) {
        this.webPluginsDirResolutionFallback = webPluginsDirResolutionFallback;
    }

    public String getPluginsWebPathPrefix() {
        return pluginsWebPathPrefix;
    }

    public void setPluginsWebPathPrefix(String pluginsWebPathPrefix) {
        this.pluginsWebPathPrefix = pluginsWebPathPrefix;
    }

    public List<String> getPathResolutionCandidateRelativePaths() {
        return pathResolutionCandidateRelativePaths;
    }

    public void setPathResolutionCandidateRelativePaths(List<String> pathResolutionCandidateRelativePaths) {
        this.pathResolutionCandidateRelativePaths = pathResolutionCandidateRelativePaths;
    }

    public String getManifestFileName() {
        return manifestFileName;
    }

    public void setManifestFileName(String manifestFileName) {
        this.manifestFileName = manifestFileName;
    }

    public String getDisabledStateFileName() {
        return disabledStateFileName;
    }

    public void setDisabledStateFileName(String disabledStateFileName) {
        this.disabledStateFileName = disabledStateFileName;
    }

    public String getListPluginsApiPath() {
        return listPluginsApiPath;
    }

    public void setListPluginsApiPath(String listPluginsApiPath) {
        this.listPluginsApiPath = listPluginsApiPath;
    }

    public String getHostPluginApiVersion() {
        return hostPluginApiVersion;
    }

    public void setHostPluginApiVersion(String hostPluginApiVersion) {
        this.hostPluginApiVersion = hostPluginApiVersion;
    }

    public String getPublicBaseUrl() {
        return publicBaseUrl;
    }

    public void setPublicBaseUrl(String publicBaseUrl) {
        this.publicBaseUrl = publicBaseUrl;
    }

    public List<String> getEntryUrlHostAllowlist() {
        return entryUrlHostAllowlist;
    }

    public void setEntryUrlHostAllowlist(List<String> entryUrlHostAllowlist) {
        this.entryUrlHostAllowlist = entryUrlHostAllowlist;
    }

    public int getMaxPlugins() {
        return maxPlugins;
    }

    public void setMaxPlugins(int maxPlugins) {
        this.maxPlugins = maxPlugins;
    }

    public int getMaxPluginsMin() {
        return maxPluginsMin;
    }

    public void setMaxPluginsMin(int maxPluginsMin) {
        this.maxPluginsMin = maxPluginsMin;
    }

    public int getMaxPluginsMax() {
        return maxPluginsMax;
    }

    public void setMaxPluginsMax(int maxPluginsMax) {
        this.maxPluginsMax = maxPluginsMax;
    }

    public String getMainAppWorkdir() {
        return mainAppWorkdir;
    }

    public void setMainAppWorkdir(String mainAppWorkdir) {
        this.mainAppWorkdir = mainAppWorkdir;
    }

    public String getMainAppPluginsSubdir() {
        return mainAppPluginsSubdir;
    }

    public void setMainAppPluginsSubdir(String mainAppPluginsSubdir) {
        this.mainAppPluginsSubdir = mainAppPluginsSubdir;
    }

    public List<String> getCorsAllowedOrigins() {
        return corsAllowedOrigins;
    }

    public void setCorsAllowedOrigins(List<String> corsAllowedOrigins) {
        this.corsAllowedOrigins = corsAllowedOrigins;
    }
}
