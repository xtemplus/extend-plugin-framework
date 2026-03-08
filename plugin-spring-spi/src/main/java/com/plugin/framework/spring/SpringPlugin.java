package com.plugin.framework.spring;


/**
 * 支持 Spring Web 集成的插件可选接口。
 *
 * <p>实现该接口的插件可以声明自身需要扫描的基础包，从而让宿主在运行期动态注册其中的
 * {@code @RestController} 到 Spring MVC 映射表。
 *
 * <p>宿主注册 Controller 时需使用插件自身的 ClassLoader（与宿主隔离）；默认实现返回
 * {@link #getClass()}.getClassLoader()。约定式插件（如 {@code DefaultConventionPlugin}）会重写
 * {@link #getPluginClassLoader()} 以返回插件 jar 的 URLClassLoader。
 */
public interface SpringPlugin {

    /**
     * 返回需要扫描的基础包列表。
     *
     * @return 包名数组
     */
    String[] getBasePackages();

    /**
     * 返回用于加载该插件内类的 ClassLoader。宿主在扫描并实例化插件内 @RestController 时使用此
     * ClassLoader，以实现与宿主 classpath 的隔离。
     *
     * <p>默认返回当前实例的 ClassLoader；约定式插件应重写为插件 jar 的 URLClassLoader。
     *
     * @return 插件类加载器，不应为 null
     */
    default ClassLoader getPluginClassLoader() {
        return getClass().getClassLoader();
    }
}

