package com.plugin.framework.spring;


/**
 * 支持 Spring Web 集成的插件可选接口。
 *
 * <p>实现该接口的插件可以声明自身需要扫描的基础包，从而让宿主在运行期动态注册其中的
 * {@code @RestController} 到 Spring MVC 映射表。
 */
public interface SpringPlugin {

    /**
     * 返回需要扫描的基础包列表。
     *
     * @return 包名数组
     */
    String[] getBasePackages();
}

