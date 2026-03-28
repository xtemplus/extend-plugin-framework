package io.github.xtemplus.pluginframework.core.runtime;

import io.github.xtemplus.pluginframework.core.extension.ExtensionPointRegistry;
import io.github.xtemplus.pluginframework.core.registry.DefaultExtensionRegistry;
import io.github.xtemplus.pluginframework.core.registry.DefaultServiceRegistry;
import io.github.xtemplus.pluginframework.core.registry.ExtensionRegistry;
import io.github.xtemplus.pluginframework.core.registry.ServiceRegistry;
import io.github.xtemplus.pluginframework.core.spi.ExtensionPoint;
import io.github.xtemplus.pluginframework.core.spi.Plugin;
import io.github.xtemplus.pluginframework.core.support.ExtensionFailurePolicy;
import io.github.xtemplus.pluginframework.core.support.ExtensionPointMethodRegistrar;
import io.github.xtemplus.pluginframework.core.support.TypeReference;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.logging.Logger;

/**
 * 插件运行时上下文，由宿主应用创建并注入到插件的 {@link Plugin#onEnable(PluginContext)}。
 *
 * <p>提供宿主名称、日志、地域、扩展点注册表与服务注册表，供插件在启用时注册扩展或获取宿主能力。
 */
public final class PluginContext {

    /** 宿主应用名称/标识。 */
    private final String hostName;

    /** 宿主提供的日志器。 */
    private final Logger logger;

    /** 地域信息。 */
    private final Locale locale;

    /** 扩展点注册表，用于注册与查询 {@link ExtensionPoint}。 */
    private final ExtensionRegistry extensionRegistry;

    /** 类型化服务注册表，用于注册与查找基于接口的服务实现。 */
    private final ServiceRegistry serviceRegistry;

    /** 扩展点契约注册表（方案 A），可选。 */
    private final ExtensionPointRegistry extensionPointRegistry;

    /**
     * 由 {@link PluginManager} 在加载插件时注入的当前插件 ID；非插件场景为 null。用于 {@link
     * #registerMapExtensionMethods(Object)} 单参数重载。
     */
    private final String scopedPluginId;

    /**
     * 使用默认扩展点注册表与服务注册表创建上下文。
     *
     * @param hostName 宿主名称
     * @param logger 日志器
     * @param locale 地域
     */
    public PluginContext(String hostName, Logger logger, Locale locale) {
        this(hostName, logger, locale, new DefaultExtensionRegistry(), new DefaultServiceRegistry());
    }

    /**
     * 使用自定义扩展点注册表创建上下文，服务注册表使用默认实现。
     *
     * @param hostName 宿主名称
     * @param logger 日志器
     * @param locale 地域
     * @param extensionRegistry 扩展点注册表
     */
    public PluginContext(
            String hostName,
            Logger logger,
            Locale locale,
            ExtensionRegistry extensionRegistry) {
        this(
                hostName,
                logger,
                locale,
                extensionRegistry,
                new DefaultServiceRegistry());
    }

    /**
     * 使用自定义扩展点注册表与服务注册表创建上下文（无扩展点契约注册表）。
     *
     * @param hostName 宿主名称
     * @param logger 日志器
     * @param locale 地域
     * @param extensionRegistry 扩展点注册表
     * @param serviceRegistry 服务注册表
     */
    public PluginContext(
            String hostName,
            Logger logger,
            Locale locale,
            ExtensionRegistry extensionRegistry,
            ServiceRegistry serviceRegistry) {
        this(
                hostName,
                logger,
                locale,
                extensionRegistry,
                serviceRegistry,
                null,
                null);
    }

    /**
     * 使用自定义扩展点注册表、服务注册表与扩展点契约注册表创建上下文。
     *
     * @param hostName 宿主名称
     * @param logger 日志器
     * @param locale 地域
     * @param extensionRegistry 扩展点注册表
     * @param serviceRegistry 服务注册表
     * @param extensionPointRegistry 扩展点契约注册表，可为 null
     */
    public PluginContext(
            String hostName,
            Logger logger,
            Locale locale,
            ExtensionRegistry extensionRegistry,
            ServiceRegistry serviceRegistry,
            ExtensionPointRegistry extensionPointRegistry) {
        this(
                hostName,
                logger,
                locale,
                extensionRegistry,
                serviceRegistry,
                extensionPointRegistry,
                null);
    }

    private PluginContext(
            String hostName,
            Logger logger,
            Locale locale,
            ExtensionRegistry extensionRegistry,
            ServiceRegistry serviceRegistry,
            ExtensionPointRegistry extensionPointRegistry,
            String scopedPluginId) {
        this.hostName = Objects.requireNonNull(hostName, "hostName");
        this.logger = Objects.requireNonNull(logger, "logger");
        this.locale = Objects.requireNonNull(locale, "locale");
        this.extensionRegistry = Objects.requireNonNull(extensionRegistry, "extensionRegistry");
        this.serviceRegistry = Objects.requireNonNull(serviceRegistry, "serviceRegistry");
        this.extensionPointRegistry = extensionPointRegistry;
        this.scopedPluginId = scopedPluginId;
    }

    /** @return 宿主名称 */
    public String getHostName() {
        return hostName;
    }

    /** @return 日志器 */
    public Logger getLogger() {
        return logger;
    }

    /** @return 地域 */
    public Locale getLocale() {
        return locale;
    }

    /** @return 扩展点注册表 */
    public ExtensionRegistry getExtensionRegistry() {
        return extensionRegistry;
    }

    /**
     * 获取首个可用 {@link ExtensionPoint}（与 {@link ExtensionRegistry#getExtension} 语义一致）并执行，返回值按
     * {@code Class<T>} 收敛为 {@code Optional<T>}。
     *
     * <p>等价于 {@code getExtensionRegistry().executeFirst(pointId, context, resultType, policy)}。
     *
     * @param <T> 期望的返回值类型，须与 {@code resultType} 一致
     * @see ExtensionRegistry#executeFirst(String, Object, Class, ExtensionFailurePolicy)
     */
    public <T> Optional<T> executeFirstExtension(
            String pointId,
            Object context,
            Class<T> resultType,
            ExtensionFailurePolicy policy) {
        return extensionRegistry.executeFirst(pointId, context, resultType, policy);
    }

    /**
     * 同 {@link #executeFirstExtension(String, Object, Class, ExtensionFailurePolicy)}，策略为 {@link
     * ExtensionFailurePolicy#FAIL_FAST}。
     *
     * @param <T> 期望的返回值类型
     */
    public <T> Optional<T> executeFirstExtension(
            String pointId, Object context, Class<T> resultType) {
        return extensionRegistry.executeFirst(pointId, context, resultType);
    }

    /**
     * 首个扩展且返回值为 {@link Map}；等价于 {@code getExtensionRegistry().executeFirstMap(...)}。
     */
    public Optional<Map<String, Object>> executeFirstExtensionMap(
            String pointId, Object context, ExtensionFailurePolicy policy) {
        return extensionRegistry.executeFirstMap(pointId, context, policy);
    }

    /** 策略为 {@link ExtensionFailurePolicy#FAIL_FAST} 的 {@link #executeFirstExtensionMap}。 */
    public Optional<Map<String, Object>> executeFirstExtensionMap(String pointId, Object context) {
        return extensionRegistry.executeFirstMap(pointId, context);
    }

    /**
     * 同 {@link ExtensionRegistry#executeFirst(String, Object, TypeReference, ExtensionFailurePolicy)}。
     */
    public <T> Optional<T> executeFirstExtension(
            String pointId,
            Object context,
            TypeReference<T> resultType,
            ExtensionFailurePolicy policy) {
        return extensionRegistry.executeFirst(pointId, context, resultType, policy);
    }

    /** 策略为 {@link ExtensionFailurePolicy#FAIL_FAST} 的 {@link #executeFirstExtension(String, Object, TypeReference, ExtensionFailurePolicy)}。 */
    public <T> Optional<T> executeFirstExtension(
            String pointId, Object context, TypeReference<T> resultType) {
        return extensionRegistry.executeFirst(pointId, context, resultType);
    }

    /**
     * 同 {@link ExtensionRegistry#executeFirst(String, Object, ExtensionFailurePolicy)}：仅 pointId + context，返回
     * {@link Object}。
     */
    public Optional<Object> executeFirstExtension(
            String pointId, Object context, ExtensionFailurePolicy policy) {
        return extensionRegistry.executeFirst(pointId, context, policy);
    }

    /** 策略为 {@link ExtensionFailurePolicy#FAIL_FAST} 的 {@link #executeFirstExtension(String, Object, ExtensionFailurePolicy)}。 */
    public Optional<Object> executeFirstExtension(String pointId, Object context) {
        return extensionRegistry.executeFirst(pointId, context);
    }

    /**
     * 等价于 {@code getExtensionRegistry().executeAll(pointId, context, elementType, policy)}。
     *
     * @param <T> 每个扩展返回值的泛型类型
     */
    public <T> List<T> executeAllExtensions(
            String pointId,
            Object context,
            TypeReference<T> elementType,
            ExtensionFailurePolicy policy) {
        return extensionRegistry.executeAll(pointId, context, elementType, policy);
    }

    /**
     * 同 {@link #executeAllExtensions(String, Object, TypeReference, ExtensionFailurePolicy)}，策略为 {@link
     * ExtensionFailurePolicy#FAIL_FAST}。
     */
    public <T> List<T> executeAllExtensions(
            String pointId, Object context, TypeReference<T> elementType) {
        return extensionRegistry.executeAll(pointId, context, elementType);
    }

    /**
     * 同 {@link ExtensionRegistry#executeAll(String, Object, Class, ExtensionFailurePolicy)}。
     */
    public <T> List<T> executeAllExtensions(
            String pointId,
            Object context,
            Class<T> elementType,
            ExtensionFailurePolicy policy) {
        return extensionRegistry.executeAll(pointId, context, elementType, policy);
    }

    /** 策略为 {@link ExtensionFailurePolicy#FAIL_FAST} 的 {@link #executeAllExtensions(String, Object, Class, ExtensionFailurePolicy)}。 */
    public <T> List<T> executeAllExtensions(
            String pointId, Object context, Class<T> elementType) {
        return extensionRegistry.executeAll(pointId, context, elementType);
    }

    /**
     * 同 {@link ExtensionRegistry#executeAll(String, Object, ExtensionFailurePolicy)}：仅 pointId + context，元素为
     * {@link Object}。
     */
    public List<Object> executeAllExtensions(
            String pointId, Object context, ExtensionFailurePolicy policy) {
        return extensionRegistry.executeAll(pointId, context, policy);
    }

    /** 策略为 {@link ExtensionFailurePolicy#FAIL_FAST} 的 {@link #executeAllExtensions(String, Object, ExtensionFailurePolicy)}。 */
    public List<Object> executeAllExtensions(String pointId, Object context) {
        return extensionRegistry.executeAll(pointId, context);
    }

    /**
     * 当前插件加载场景下的插件 ID；由 {@link #withExtensionRegistry(String, ExtensionRegistry)} 设置，否则为
     * null。
     *
     * @return 插件 ID 或 null
     */
    public String getScopedPluginId() {
        return scopedPluginId;
    }

    /**
     * 将宿主对象上 {@link io.github.xtemplus.pluginframework.core.spi.ExtPoint} /
     * {@link io.github.xtemplus.pluginframework.core.spi.ExtRunCondition} 标注的方法注册为扩展点。
     *
     * @param pluginId 插件 ID，卸载时可通过 {@link ExtensionRegistry#unregisterByPluginId(String)} 移除
     * @param host 包含注解方法的实例（通常为插件 {@code this}）
     * @see ExtensionPointMethodRegistrar#registerAll(String, Object, ExtensionRegistry)
     */
    public void registerMapExtensionMethods(String pluginId, Object host) {
        ExtensionPointMethodRegistrar.registerAll(
                Objects.requireNonNull(pluginId, "pluginId"),
                Objects.requireNonNull(host, "host"),
                extensionRegistry);
    }

    /**
     * 在 {@link PluginManager} 注入的插件上下文中注册注解扩展点，等价于 {@link
     * #registerMapExtensionMethods(String, Object) registerMapExtensionMethods}({@link #getScopedPluginId()},
     * host)。
     *
     * @param host 包含注解方法的实例（通常为 {@code this}）
     * @throws IllegalStateException 非插件 scoped 上下文（{@link #getScopedPluginId()} 为 null）
     */
    public void registerMapExtensionMethods(Object host) {
        if (scopedPluginId == null) {
            throw new IllegalStateException(
                    "registerMapExtensionMethods(host) requires plugin-scoped PluginContext "
                            + "(from PluginManager onEnable); otherwise use registerMapExtensionMethods(pluginId, host)");
        }
        registerMapExtensionMethods(scopedPluginId, host);
    }

    /**
     * 返回一个使用指定扩展点注册表的新上下文（用于加载插件时注入按 pluginId 绑定的注册表）。
     *
     * @param extensionRegistry 扩展点注册表
     * @return 新上下文实例，其余字段与当前一致；{@link #getScopedPluginId()} 为 null
     */
    public PluginContext withExtensionRegistry(ExtensionRegistry extensionRegistry) {
        return new PluginContext(
                hostName,
                logger,
                locale,
                Objects.requireNonNull(extensionRegistry, "extensionRegistry"),
                serviceRegistry,
                extensionPointRegistry,
                null);
    }

    /**
     * 与 {@link #withExtensionRegistry(ExtensionRegistry)} 相同，并绑定当前加载的插件 ID，以支持 {@link
     * #registerMapExtensionMethods(Object)}。
     *
     * @param pluginId 当前插件 ID，须与 {@link Plugin#getId()} 及元数据一致
     * @param extensionRegistry 通常为 {@link io.github.xtemplus.pluginframework.core.registry.PluginScopedExtensionRegistry}
     * @return 新上下文实例
     */
    public PluginContext withExtensionRegistry(String pluginId, ExtensionRegistry extensionRegistry) {
        return new PluginContext(
                hostName,
                logger,
                locale,
                Objects.requireNonNull(extensionRegistry, "extensionRegistry"),
                serviceRegistry,
                extensionPointRegistry,
                Objects.requireNonNull(pluginId, "pluginId"));
    }

    /** @return 服务注册表 */
    public ServiceRegistry getServiceRegistry() {
        return serviceRegistry;
    }

    /**
     * 扩展点契约注册表（方案 A）；为 null 时不使用声明式扩展点注册。
     *
     * @return 扩展点契约注册表，可能为 null
     */
    public ExtensionPointRegistry getExtensionPointRegistry() {
        return extensionPointRegistry;
    }
}
