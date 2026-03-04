package com.plugin.framework.core.spi;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 标记插件侧提供的服务扩展实现。
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface PluginService {

    /**
     * 全局唯一服务 ID。
     *
     * @return 服务 ID
     */
    String id();

    /**
     * 契约接口类型，缺省时可由工具类推断。
     *
     * @return 接口类型
     */
    Class<?> contract() default Void.class;
}

