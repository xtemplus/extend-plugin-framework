package com.example.pluginframework.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 示例宿主应用入口。
 */
@SpringBootApplication
public class ExampleApplication {

    /**
     * 启动示例宿主应用。
     *
     * @param args 启动参数
     */
    public static void main(String[] args) {
        SpringApplication.run(ExampleApplication.class, args);
    }
}

