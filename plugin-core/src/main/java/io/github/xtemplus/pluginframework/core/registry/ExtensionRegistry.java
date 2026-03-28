package io.github.xtemplus.pluginframework.core.registry;

import io.github.xtemplus.pluginframework.core.spi.ExtensionPoint;
import io.github.xtemplus.pluginframework.core.support.ExtensionFailurePolicy;
import io.github.xtemplus.pluginframework.core.support.TypeReference;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 扩展点注册表：维护扩展点实现的注册与按 pointId + context 的查找。
 *
 * <p>宿主与插件通过约定扩展点 ID 与上下文类型，由插件注册 {@link ExtensionPoint} 实现，宿主按 ID 查询并执行。
 *
 * <p>排序、单次/批量执行等便捷方法以 {@code default} 形式在本接口上提供，调用时无需再向工具类重复传入 {@code
 * ExtensionRegistry}。
 */
public interface ExtensionRegistry {

    /**
     * 注册扩展点实现。
     *
     * @param extension 扩展点实现
     */
    void register(ExtensionPoint<?, ?> extension);

    /**
     * 按插件 ID 注册扩展点实现（插件卸载时会自动移除）。
     *
     * @param pluginId 插件 ID，不能为空
     * @param extension 扩展点实现
     */
    void register(String pluginId, ExtensionPoint<?, ?> extension);

    /**
     * 移除指定插件注册的所有扩展点（插件卸载时由框架调用）。
     *
     * @param pluginId 插件 ID
     */
    void unregisterByPluginId(String pluginId);

    /**
     * 根据扩展点 ID 和上下文获取可用扩展实现。
     *
     * @param pointId 扩展点 ID
     * @param context 调用上下文
     * @return 支持该上下文的扩展实现列表，按注册顺序返回
     */
    List<ExtensionPoint<?, ?>> getExtensions(String pointId, Object context);

    /**
     * 在 supports 过滤后的实现中，按 {@link ExtensionPoint#getOrder()} 升序、同 order 按 {@link #getExtensions}
     * 列表中的相对顺序取第一个。
     *
     * @param pointId 扩展点 ID
     * @param context 调用上下文
     * @return 首个扩展，可能为空
     */
    default Optional<ExtensionPoint<?, ?>> getExtension(String pointId, Object context) {
        return ExtensionExecutions.firstExtension(this, pointId, context);
    }

    /**
     * 在 supports 已过滤的列表上，按 {@code (getOrder(), 原列表下标)} 升序排序后的扩展列表（新列表）。
     *
     * <p>不改变 {@link #getExtensions} 的语义与顺序；仅在副本上排序。
     */
    default List<ExtensionPoint<?, ?>> orderedExtensions(String pointId, Object context) {
        return ExtensionExecutions.orderedExtensions(this, pointId, context);
    }

    /**
     * 取得首个可用扩展并执行：语义同 {@link #getExtension(String, Object)}（按 order 最小等规则），再对该实现调用
     * {@link ExtensionPoint#execute}，将返回值收敛为 {@code Optional<T>}。
     *
     * <p>{@code T} 由 {@code resultType} 指定；无扩展、{@code null} 或类型不符时为 {@code Optional.empty()}；{@code
     * execute} 抛错时行为见 {@link ExtensionFailurePolicy}。
     *
     * @param <T> 期望的返回值类型（与 {@code resultType} 一致）
     * @param pointId 扩展点 ID
     * @param context 调用上下文
     * @param resultType 返回值运行时类型，用于 {@link Class#isInstance} 校验与 {@link Class#cast}
     * @param policy 失败策略
     */
    default <T> Optional<T> executeFirst(
            String pointId,
            Object context,
            Class<T> resultType,
            ExtensionFailurePolicy policy) {
        return ExtensionExecutions.executeFirst(this, pointId, context, resultType, policy);
    }

    /**
     * 同 {@link #executeFirst(String, Object, Class, ExtensionFailurePolicy)}，策略为 {@link
     * ExtensionFailurePolicy#FAIL_FAST}。
     *
     * @param <T> 期望的返回值类型
     */
    default <T> Optional<T> executeFirst(String pointId, Object context, Class<T> resultType) {
        return ExtensionExecutions.executeFirst(
                this, pointId, context, resultType, ExtensionFailurePolicy.FAIL_FAST);
    }

    /**
     * 同 {@link #executeFirst(String, Object, Class, ExtensionFailurePolicy)}，使用 {@link TypeReference} 表达泛型返回值（如
     * {@code Map<String, Object>}）；运行时校验使用 {@link TypeReference#getRawType()}。
     */
    default <T> Optional<T> executeFirst(
            String pointId,
            Object context,
            TypeReference<T> resultType,
            ExtensionFailurePolicy policy) {
        return ExtensionExecutions.executeFirst(this, pointId, context, resultType, policy);
    }

    /**
     * 同 {@link #executeFirst(String, Object, TypeReference, ExtensionFailurePolicy)}，策略为 {@link
     * ExtensionFailurePolicy#FAIL_FAST}。
     */
    default <T> Optional<T> executeFirst(
            String pointId, Object context, TypeReference<T> resultType) {
        return ExtensionExecutions.executeFirst(
                this, pointId, context, resultType, ExtensionFailurePolicy.FAIL_FAST);
    }

    /**
     * 首个扩展并执行，返回原始 {@link Object}，不做 {@link Class#isInstance} 校验。
     *
     * <p>无可用扩展，或扩展返回 {@code null}，均为 {@code Optional.empty()}。{@code execute} 抛错行为见策略。
     */
    default Optional<Object> executeFirst(
            String pointId, Object context, ExtensionFailurePolicy policy) {
        return ExtensionExecutions.executeFirst(this, pointId, context, policy);
    }

    /**
     * 同 {@link #executeFirst(String, Object, ExtensionFailurePolicy)}，策略为 {@link
     * ExtensionFailurePolicy#FAIL_FAST}。
     */
    default Optional<Object> executeFirst(String pointId, Object context) {
        return ExtensionExecutions.executeFirst(
                this, pointId, context, ExtensionFailurePolicy.FAIL_FAST);
    }

    /**
     * 首个扩展且返回值为 {@link Map}。
     */
    default Optional<Map<String, Object>> executeFirstMap(
            String pointId, Object context, ExtensionFailurePolicy policy) {
        return ExtensionExecutions.executeFirstMap(this, pointId, context, policy);
    }

    /**
     * 策略为 {@link ExtensionFailurePolicy#FAIL_FAST} 的 {@link #executeFirstMap}。
     */
    default Optional<Map<String, Object>> executeFirstMap(String pointId, Object context) {
        return ExtensionExecutions.executeFirstMap(
                this, pointId, context, ExtensionFailurePolicy.FAIL_FAST);
    }

    /**
     * 按 order 排序后依次执行全部可用扩展，收集类型匹配的返回值。
     */
    default <T> List<T> executeAll(
            String pointId,
            Object context,
            Class<T> resultType,
            ExtensionFailurePolicy policy) {
        return ExtensionExecutions.executeAll(this, pointId, context, resultType, policy);
    }

    /**
     * 同 {@link #executeAll(String, Object, Class, ExtensionFailurePolicy)}，策略为 {@link
     * ExtensionFailurePolicy#FAIL_FAST}。
     */
    default <T> List<T> executeAll(String pointId, Object context, Class<T> resultType) {
        return ExtensionExecutions.executeAll(
                this, pointId, context, resultType, ExtensionFailurePolicy.FAIL_FAST);
    }

    /**
     * 同 {@link #executeAll(String, Object, Class, ExtensionFailurePolicy)}，使用 {@link TypeReference} 表达元素泛型类型。
     */
    default <T> List<T> executeAll(
            String pointId,
            Object context,
            TypeReference<T> resultType,
            ExtensionFailurePolicy policy) {
        return ExtensionExecutions.executeAll(this, pointId, context, resultType, policy);
    }

    /**
     * 同 {@link #executeAll(String, Object, TypeReference, ExtensionFailurePolicy)}，策略为 {@link
     * ExtensionFailurePolicy#FAIL_FAST}。
     */
    default <T> List<T> executeAll(
            String pointId, Object context, TypeReference<T> resultType) {
        return ExtensionExecutions.executeAll(
                this, pointId, context, resultType, ExtensionFailurePolicy.FAIL_FAST);
    }

    /**
     * 按 order 依次执行全部可用扩展，收集 {@link Object}，不做类型过滤。
     *
     * <p>元素可为 {@code null}；{@code execute} 抛错时行为见策略。
     */
    default List<Object> executeAll(
            String pointId, Object context, ExtensionFailurePolicy policy) {
        return ExtensionExecutions.executeAll(this, pointId, context, policy);
    }

    /**
     * 同 {@link #executeAll(String, Object, ExtensionFailurePolicy)}，策略为 {@link
     * ExtensionFailurePolicy#FAIL_FAST}。
     */
    default List<Object> executeAll(String pointId, Object context) {
        return ExtensionExecutions.executeAll(
                this, pointId, context, ExtensionFailurePolicy.FAIL_FAST);
    }

    /**
     * 批量执行且结果元素为 {@link Map}。
     */
    default List<Map<String, Object>> executeAllMaps(
            String pointId, Object context, ExtensionFailurePolicy policy) {
        return ExtensionExecutions.executeAllMaps(this, pointId, context, policy);
    }

    /**
     * 策略为 {@link ExtensionFailurePolicy#FAIL_FAST} 的 {@link #executeAllMaps}。
     */
    default List<Map<String, Object>> executeAllMaps(String pointId, Object context) {
        return ExtensionExecutions.executeAllMaps(
                this, pointId, context, ExtensionFailurePolicy.FAIL_FAST);
    }
}
