package com.plugin.framework.spring;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Objects;
import java.util.Set;

import com.plugin.framework.core.spi.Plugin;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.MethodIntrospector;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.util.ClassUtils;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

/**
 * 在运行期为插件的 Spring Controller 注册到宿主应用的 Spring MVC。
 *
 * <p>仅处理实现 {@link SpringPlugin} 的插件，根据 {@link SpringPlugin#getBasePackages()} 扫描
 * 带 {@link org.springframework.web.bind.annotation.RestController} 的类，创建 Bean 并注册到
 * {@link RequestMappingHandlerMapping}；卸载插件时可调用 {@link #unregister(String)} 移除映射。
 */
public final class PluginSpringRegistrar {

    private final ConfigurableApplicationContext applicationContext;
    private final RequestMappingHandlerMapping handlerMapping;

    /** 插件 ID -> 该插件注册的 Controller Bean 名称集合，用于卸载时批量取消映射。 */
    private final Map<String, Set<String>> pluginControllerBeans = new HashMap<>();

    /**
     * 创建注册器。
     *
     * @param applicationContext 宿主应用上下文
     * @param handlerMapping Spring MVC 的 HandlerMapping
     */
    public PluginSpringRegistrar(
            ConfigurableApplicationContext applicationContext,
            RequestMappingHandlerMapping handlerMapping) {
        this.applicationContext = Objects.requireNonNull(applicationContext, "applicationContext");
        this.handlerMapping = Objects.requireNonNull(handlerMapping, "handlerMapping");
    }

    /**
     * 为实现了 {@link SpringPlugin} 的插件注册 Controller。
     *
     * @param plugin 插件实例
     */
    public void register(Object plugin) {
        if (!(plugin instanceof SpringPlugin)) {
            return;
        }
        SpringPlugin springPlugin = (SpringPlugin) plugin;
        String pluginId =
                plugin instanceof Plugin ? ((Plugin) plugin).getId() : plugin.getClass().getName();
        String[] basePackages = springPlugin.getBasePackages();
        if (basePackages == null || basePackages.length == 0) {
            return;
        }
        ClassLoader pluginClassLoader = getPluginClassLoader(plugin);
        Set<String> beanNamesForPlugin =
                pluginControllerBeans.computeIfAbsent(pluginId, key -> new HashSet<>());
        for (String basePackage : basePackages) {
            registerControllersInPackage(
                    basePackage, pluginClassLoader, pluginId, beanNamesForPlugin);
        }
    }

    /** 约定式插件使用其 URLClassLoader，否则使用插件类的 ClassLoader。 */
    private static ClassLoader getPluginClassLoader(Object plugin) {
        if (plugin instanceof DefaultConventionPlugin) {
            return ((DefaultConventionPlugin) plugin).getPluginClassLoader();
        }
        return plugin.getClass().getClassLoader();
    }

    /** 在指定包下扫描 @RestController，创建 Bean 并注册 Handler 方法。 */
    private void registerControllersInPackage(
            String basePackage,
            ClassLoader pluginClassLoader,
            String pluginId,
            Set<String> beanNamesForPlugin) {
        if (basePackage == null || basePackage.isEmpty()) {
            return;
        }
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        scanner.setResourceLoader(new PathMatchingResourcePatternResolver(pluginClassLoader));
        Set<BeanDefinition> candidates = scanner.findCandidateComponents(basePackage);
        for (BeanDefinition candidate : candidates) {
            String className = candidate.getBeanClassName();
            if (className == null) {
                continue;
            }
            try {
                Class<?> controllerClass = ClassUtils.forName(className, pluginClassLoader);
                String beanName = buildBeanName(pluginId, controllerClass);
                if (applicationContext.containsBean(beanName)) {
                    Object existingController = applicationContext.getBean(beanName);
                    beanNamesForPlugin.add(beanName);
                    registerHandlerMethods(beanName, existingController);
                    continue;
                }
                Object controller =
                        applicationContext
                                .getAutowireCapableBeanFactory()
                                .createBean(controllerClass);
                applicationContext.getBeanFactory().registerSingleton(beanName, controller);
                beanNamesForPlugin.add(beanName);
                registerHandlerMethods(beanName, controller);
            } catch (ClassNotFoundException ex) {
                // 单个 Controller 加载失败则跳过
            }
        }
    }

    /** Bean 名称格式：pluginId#Controller 全类名。 */
    private String buildBeanName(String pluginId, Class<?> controllerClass) {
        return pluginId + "#" + controllerClass.getName();
    }

    /**
     * 根据插件 ID 卸载其注册过的所有 Spring MVC Controller。
     *
     * @param pluginId 插件唯一标识
     */
    public void unregister(String pluginId) {
        if (pluginId == null || pluginId.isEmpty()) {
            return;
        }
        Set<String> beanNames = pluginControllerBeans.remove(pluginId);
        if (beanNames == null || beanNames.isEmpty()) {
            return;
        }
        for (String beanName : beanNames) {
            unregisterHandlerMethods(beanName);
        }
    }

    /** 通过反射调用 RequestMappingHandlerMapping#getMappingForMethod 并注册映射。 */
    private void registerHandlerMethods(String beanName, Object controller) {
        Class<?> handlerType = controller.getClass();
        Method mappingMethod;
        try {
            mappingMethod =
                    RequestMappingHandlerMapping.class.getDeclaredMethod(
                            "getMappingForMethod", Method.class, Class.class);
        } catch (NoSuchMethodException ex) {
            return;
        }
        mappingMethod.setAccessible(true);
        Map<Method, RequestMappingInfo> methods =
                MethodIntrospector.selectMethods(
                        handlerType,
                        (MethodIntrospector.MetadataLookup<RequestMappingInfo>)
                                method -> {
                                    try {
                                        return (RequestMappingInfo)
                                                mappingMethod.invoke(
                                                        handlerMapping, method, handlerType);
                                    } catch (ReflectiveOperationException ex) {
                                        return null;
                                    }
                                });
        for (Entry<Method, RequestMappingInfo> entry : methods.entrySet()) {
            RequestMappingInfo mapping = entry.getValue();
            if (mapping != null) {
                handlerMapping.registerMapping(mapping, beanName, entry.getKey());
            }
        }
    }

    /** 从 handlerMapping 中找出该 bean 对应的所有 RequestMappingInfo 并取消注册。 */
    private void unregisterHandlerMethods(String beanName) {
        Map<RequestMappingInfo, HandlerMethod> handlerMethods =
                handlerMapping.getHandlerMethods();
        List<RequestMappingInfo> toRemove = new ArrayList<>();
        for (Entry<RequestMappingInfo, HandlerMethod> entry : handlerMethods.entrySet()) {
            HandlerMethod handlerMethod = entry.getValue();
            if (Objects.equals(beanName, handlerMethod.getBean())) {
                toRemove.add(entry.getKey());
            }
        }
        for (RequestMappingInfo info : toRemove) {
            handlerMapping.unregisterMapping(info);
        }
    }
}

