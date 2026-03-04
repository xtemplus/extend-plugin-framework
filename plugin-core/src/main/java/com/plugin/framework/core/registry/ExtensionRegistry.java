package com.plugin.framework.core.registry;

import com.plugin.framework.core.spi.ExtensionPoint;
import java.util.List;

/**
 * 扩展点注册表。
 *
 * <p>负责维护扩展点实现的注册与查找。
 */
public interface ExtensionRegistry {

    /**
     * 注册扩展点实现。
     *
     * @param extension 扩展点实现
     */
    void register(ExtensionPoint<?, ?> extension);

    /**
     * 根据扩展点 ID 和上下文获取可用扩展实现。
     *
     * @param pointId 扩展点 ID
     * @param context 调用上下文
     * @return 支持该上下文的扩展实现列表，按注册顺序返回
     */
    List<ExtensionPoint<?, ?>> getExtensions(String pointId, Object context);
}

