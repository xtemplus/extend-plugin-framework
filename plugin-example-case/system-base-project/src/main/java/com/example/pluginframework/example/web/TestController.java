package com.example.pluginframework.example.web;


import com.example.pluginframework.api.UserExtendPlugin;
import io.github.extend.plugin.core.registry.ServiceRegistry;
import io.github.extend.plugin.core.runtime.PluginContext;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Objects;

/**
 * 宿主应用内置示例接口。
 */
@RestController
public class TestController {


    private final PluginContext pluginContext;

    public TestController(PluginContext pluginContext) {
        this.pluginContext = Objects.requireNonNull(pluginContext, "pluginContext");
    }


    /**
     * 示例接口：直接调用用户扩展的 doEat 方法。
     *
     * @return 插件或宿主返回结果
     */
    @GetMapping("/test2")
    public String test2() {
        ServiceRegistry serviceRegistry = pluginContext.getServiceRegistry();
        UserExtendPlugin userService =
                serviceRegistry
                        .getService(
                                "com.template.UserExtendPluginImpl", UserExtendPlugin.class)
                        .orElse(null);
        if (userService != null) {
            return userService.doEat("apple");
        }
        return "host /test2 from main application (no user plugin)";
    }

}


