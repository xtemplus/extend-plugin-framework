package com.plugin.framework.core.support;

import com.plugin.framework.core.registry.ServiceRegistry;
import com.plugin.framework.core.spi.PluginService;
import java.util.Collection;
import java.util.List;
import java.util.Objects;

/**
 * 基于 {@link PluginService} 注解的服务注册辅助类。
 *
 * <p>支持对显式传入的实例注册，以及按 ClassLoader + 包列表扫描 jar 内带 @PluginService 的类并注册。
 */
public final class AnnotatedServiceRegistrar {

    private AnnotatedServiceRegistrar() {}

    /**
     * 为单个实例根据 {@link PluginService} 注解完成注册。
     *
     * @param instance 实例对象
     * @param registry 服务注册表
     */
    public static void registerAnnotated(Object instance, ServiceRegistry registry) {
        Objects.requireNonNull(instance, "instance");
        Objects.requireNonNull(registry, "registry");
        Class<?> implClass = instance.getClass();
        PluginService annotation = implClass.getAnnotation(PluginService.class);
        if (annotation == null) {
            return;
        }
        String id = annotation.id();
        Class<?> contractType = annotation.contract();
        if (contractType == Void.class) {
            Class<?>[] interfaces = implClass.getInterfaces();
            if (interfaces.length > 0) {
                contractType = interfaces[0];
            } else {
                return;
            }
        }
        @SuppressWarnings("unchecked")
        Class<Object> castType = (Class<Object>) contractType;
        registry.register(id, castType, instance);
    }

    /**
     * 为一组实例根据 {@link PluginService} 注解完成批量注册。
     *
     * @param instances 实例集合
     * @param registry 服务注册表
     */
    public static void registerAnnotatedServices(
            Collection<?> instances, ServiceRegistry registry) {
        Objects.requireNonNull(instances, "instances");
        Objects.requireNonNull(registry, "registry");
        for (Object instance : instances) {
            registerAnnotated(instance, registry);
        }
    }

    /**
     * 在 classLoader 代表的 jar 中扫描指定包下带 {@link PluginService} 的类，实例化并注册到 registry。
     * 用于约定式插件（无显式 Plugin 入口类）的默认 onEnable 行为。
     *
     * @param classLoader 插件 ClassLoader（通常为 URLClassLoader）
     * @param registry 服务注册表
     * @param basePackages 要扫描的包名数组
     */
    public static void registerAll(
            ClassLoader classLoader,
            ServiceRegistry registry,
            String[] basePackages) {
        Objects.requireNonNull(classLoader, "classLoader");
        Objects.requireNonNull(registry, "registry");
        if (basePackages == null || basePackages.length == 0) {
            return;
        }
        List<String> classNames =
                PluginClassLoaderScan.listClassNamesInPackages(classLoader, basePackages);
        for (String className : classNames) {
            try {
                Class<?> clazz = classLoader.loadClass(className);
                if (clazz.getAnnotation(PluginService.class) == null) {
                    continue;
                }
                Object instance = clazz.getDeclaredConstructor().newInstance();
                registerAnnotated(instance, registry);
            } catch (ReflectiveOperationException e) {
                // 跳过无法实例化的类（如抽象类、无参构造不可见等）
            }
        }
    }
}

