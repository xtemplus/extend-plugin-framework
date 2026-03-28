package com.example.pluginframework.sample;

import com.example.pluginframework.api.UserExtendPlugin;
import io.github.extend.plugin.core.spi.PluginService;

@PluginService(id = "com.template.UserExtendPluginImpl", contract = UserExtendPlugin.class)
public class UserExtendPluginImpl implements UserExtendPlugin {

    @Override
    public String doEat(String food) {
        return "plugin eat: " + food;
    }

    @Override
    public String doSleep(int minutes) {
        return "plugin sleep for " + minutes + " minutes";
    }
}


