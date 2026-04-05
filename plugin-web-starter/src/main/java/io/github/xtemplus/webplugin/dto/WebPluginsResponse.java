package io.github.xtemplus.webplugin.dto;

import java.util.ArrayList;
import java.util.List;

public class WebPluginsResponse {

    /** Set from {@code web-plugin.host-plugin-api-version} when building the response. */
    private String hostPluginApiVersion;
    private List<WebPluginDescriptor> plugins = new ArrayList<>();

    public String getHostPluginApiVersion() {
        return hostPluginApiVersion;
    }

    public void setHostPluginApiVersion(String hostPluginApiVersion) {
        this.hostPluginApiVersion = hostPluginApiVersion;
    }

    public List<WebPluginDescriptor> getPlugins() {
        return plugins;
    }

    public void setPlugins(List<WebPluginDescriptor> plugins) {
        this.plugins = plugins;
    }
}
