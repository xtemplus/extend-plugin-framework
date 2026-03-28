package io.github.xtemplus.pluginframework.core.spi;

import io.github.xtemplus.pluginframework.core.registry.ServiceRegistry;
import io.github.xtemplus.pluginframework.core.support.AnnotatedServiceRegistrar;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 标记插件侧提供的服务扩展实现，配合 {@link AnnotatedServiceRegistrar} 使用。
 *
 * <p>用于约定式插件中扫描并注册到 {@link ServiceRegistry}。
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
     * 契约接口类型；为 Void.class 时由工具类从实现类的第一个接口推断。
     *
     * @return 接口类型
     */
    Class<?> contract() default Void.class;
}

