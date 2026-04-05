package com.example.pluginframework.example.web;

import io.github.xtemplus.webplugin.api.WebPluginFacade;
import io.github.xtemplus.webplugin.dto.WebPluginsResponse;

import java.util.Objects;

import javax.servlet.http.HttpServletRequest;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 前端扩展清单 API，供宿主与浏览器/Vite 代理调用；路径与 {@code web-plugin.list-plugins-api-path} 一致。
 */
@RestController
public class FrontendPluginsController {

    private final WebPluginFacade webPlugins;

    public FrontendPluginsController(WebPluginFacade webPlugins) {
        this.webPlugins = Objects.requireNonNull(webPlugins, "webPlugins");
    }

    @GetMapping("/frontend-plugins")
    public WebPluginsResponse list(HttpServletRequest request) {
        return webPlugins.listPluginsForRequest(request);
    }
}
