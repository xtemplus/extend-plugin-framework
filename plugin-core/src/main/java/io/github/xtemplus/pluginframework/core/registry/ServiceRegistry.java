package io.github.xtemplus.pluginframework.core.registry;

import java.util.List;
import java.util.Optional;

/**
 * 类型化服务扩展注册表：按服务 ID 与契约接口类型注册与查找实现（如 UserExtendPlugin 等）。
 *
 * <p>与 {@link ExtensionRegistry} 区别在于按接口类型 + ID 管理，适合“一个接口多实现”的服务扩展。
 */
public interface ServiceRegistry {

    /**
     * 注册服务实现。
     *
     * @param id 全局唯一服务 ID
     * @param contractType 服务接口类型
     * @param instance 服务实例
     * @param <T> 服务接口类型
     */
    <T> void register(String id, Class<T> contractType, T instance);

    /**
     * 根据 ID 和接口类型查找服务实现。
     *
     * @param id 服务 ID
     * @param contractType 服务接口类型
     * @param <T> 服务接口类型
     * @return 匹配的服务实例
     */
    <T> Optional<T> getService(String id, Class<T> contractType);

    /**
     * 按接口类型查找所有服务实现。
     *
     * @param contractType 服务接口类型
     * @param <T> 服务接口类型
     * @return 匹配的服务实例列表
     */
    <T> List<T> getServicesByType(Class<T> contractType);

    /**
     * 取消注册服务。
     *
     * @param id 服务 ID
     */
    void unregister(String id);
}

