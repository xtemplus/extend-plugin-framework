package io.github.xtemplus.pluginframework.springweb.config;

import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.context.EnvironmentAware;
import org.springframework.context.ResourceLoaderAware;
import org.springframework.context.annotation.ClassPathBeanDefinitionScanner;
import org.springframework.context.annotation.ImportBeanDefinitionRegistrar;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ResourceLoader;
import org.springframework.core.type.AnnotationMetadata;

/**
 * 运行时从 Environment 读取扫描包（避免在 {@code @ComponentScan} 中写占位符导致 IDE 误报）。
 *
 * <p>行为等价于 {@code @ComponentScan}（默认过滤器：{@code @Component} / {@code @Service} 等）。
 */
public class PluginWebComponentScanRegistrar implements ImportBeanDefinitionRegistrar, EnvironmentAware, ResourceLoaderAware {

    private Environment environment;
    private ResourceLoader resourceLoader;

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void setResourceLoader(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @Override
    public void registerBeanDefinitions(AnnotationMetadata importingClassMetadata, BeanDefinitionRegistry registry) {
        String basePackage =
                environment.getProperty(
                        PluginSpringWebSupport.SCAN_BASE_PACKAGES_PROPERTY,
                        PluginSpringWebSupport.DEFAULT_SCAN_BASE_PACKAGE);
        ClassPathBeanDefinitionScanner scanner = new ClassPathBeanDefinitionScanner(registry);
        scanner.setResourceLoader(resourceLoader);
        scanner.setEnvironment(environment);
        scanner.scan(basePackage);
    }
}
