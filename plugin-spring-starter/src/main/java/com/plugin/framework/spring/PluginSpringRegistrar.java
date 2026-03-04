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
 * 帮助宿主应用在运行期为插件注册 Spring MVC Controller。
 */
public final class PluginSpringRegistrar {

    private final ConfigurableApplicationContext applicationContext;

    private final RequestMappingHandlerMapping handlerMapping;

    private final Map<String, Set<String>> pluginControllerBeans = new HashMap<>();

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

    private static ClassLoader getPluginClassLoader(Object plugin) {
        if (plugin instanceof DefaultConventionPlugin) {
            return ((DefaultConventionPlugin) plugin).getPluginClassLoader();
        }
        return plugin.getClass().getClassLoader();
    }

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
                Class<?> controllerClass =
                        ClassUtils.forName(className, pluginClassLoader);
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
                // ignore single controller failure
            }
        }
    }

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

