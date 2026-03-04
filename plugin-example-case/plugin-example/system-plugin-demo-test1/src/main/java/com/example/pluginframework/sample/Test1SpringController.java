package com.example.pluginframework.sample;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 基于 Spring MVC 的插件示例 Controller，实现若干简单演示接口。
 */
@RestController
public class Test1SpringController {

    /**
     * 最简单示例接口：返回固定字符串。
     *
     * @return 文本响应
     */
    @GetMapping("/test1")
    public String test1() {
        return "hello from spring plugin controller /test1";
    }

    /**
     * 带查询参数的示例接口：回显 name。
     *
     * @param name 名称
     * @return 文本响应
     */
    @GetMapping("/plugin/demo/echo")
    public String echo(@RequestParam(name = "name", defaultValue = "world") String name) {
        return "echo from plugin: " + name;
    }

    /**
     * 返回 JSON 的示例接口：包含时间与插件来源标识。
     *
     * @return JSON Map
     */
    @GetMapping("/plugin/demo/info")
    public Map<String, Object> info() {
        Map<String, Object> result = new HashMap<>();
        result.put("source", "system-plugin-demo-test1");
        result.put("message", "hello from plugin json api");
        result.put("time", LocalDateTime.now().toString());
        return result;
    }
}

