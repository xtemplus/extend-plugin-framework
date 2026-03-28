package io.github.xtemplus.pluginframework.core.extension;

import java.util.List;
import java.util.Optional;

/**
 * 扩展点运行时：按扩展点 ID 调用实现，支持契约校验与进程内/HTTP 执行。
 *
 * <p>宿主通过 {@link #invoke(String, Object)} 或 {@link #invokeAll(String, Object)} 调用扩展点；
 * 入参建议为 {@link java.util.Map}&lt;String, Object&gt;，返回为单结果或结果列表。
 */
public interface ExtensionPointRuntime {

    /**
     * 同步调用单个扩展点，返回第一个有效实现的结果。
     *
     * @param pointId 扩展点 ID
     * @param input 入参，通常为 Map&lt;String, Object&gt;
     * @return 第一个非 null 结果，无实现或全部返回 null 时返回 null
     * @throws ExtensionPointRuntimeException 契约校验失败或执行异常时抛出
     */
    Object invoke(String pointId, Object input);

    /**
     * 调用该扩展点下所有实现并聚合结果为列表（用于多实现聚合场景）。
     *
     * @param pointId 扩展点 ID
     * @param input 入参，通常为 Map&lt;String, Object&gt;
     * @return 所有非 null 结果列表，无实现时返回空列表
     * @throws ExtensionPointRuntimeException 契约校验失败或执行异常时抛出
     */
    List<Object> invokeAll(String pointId, Object input);

    /**
     * 查询某扩展点的契约定义（只读），用于文档或运行时校验。
     *
     * @param pointId 扩展点 ID
     * @return 扩展点定义，未注册则 empty
     */
    Optional<ExtensionPointDefinition> getDefinition(String pointId);
}
