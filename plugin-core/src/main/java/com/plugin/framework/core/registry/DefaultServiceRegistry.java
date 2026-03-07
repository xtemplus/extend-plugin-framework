package com.plugin.framework.core.registry;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 默认服务扩展注册表实现：线程安全，支持按 ID+契约类型查找与按契约类型批量查找。
 */
public final class DefaultServiceRegistry implements ServiceRegistry {

    /** 内部：服务 ID、契约类型与实例。 */
    private static final class ServiceHolder {

        private final String id;
        private final Class<?> contractType;
        private final Object instance;

        private ServiceHolder(String id, Class<?> contractType, Object instance) {
            this.id = id;
            this.contractType = contractType;
            this.instance = instance;
        }
    }

    private final Map<String, ServiceHolder> servicesById = new ConcurrentHashMap<>();
    private final Map<Class<?>, List<ServiceHolder>> servicesByType = new ConcurrentHashMap<>();

    @Override
    public <T> void register(String id, Class<T> contractType, T instance) {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(contractType, "contractType");
        Objects.requireNonNull(instance, "instance");
        ServiceHolder holder = new ServiceHolder(id, contractType, instance);
        servicesById.put(id, holder);
        servicesByType
                .computeIfAbsent(contractType, key -> new ArrayList<>())
                .add(holder);
    }

    @Override
    public <T> Optional<T> getService(String id, Class<T> contractType) {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(contractType, "contractType");
        ServiceHolder holder = servicesById.get(id);
        if (holder == null) {
            return Optional.empty();
        }
        // 契约类型需与注册时一致或为其父类型
        if (!contractType.isAssignableFrom(holder.contractType)) {
            return Optional.empty();
        }
        Object instance = holder.instance;
        return Optional.of(contractType.cast(instance));
    }

    @Override
    public <T> List<T> getServicesByType(Class<T> contractType) {
        Objects.requireNonNull(contractType, "contractType");
        List<ServiceHolder> holders = servicesByType.get(contractType);
        if (holders == null || holders.isEmpty()) {
            return Collections.emptyList();
        }
        List<T> result = new ArrayList<>(holders.size());
        for (ServiceHolder holder : holders) {
            Object instance = holder.instance;
            if (contractType.isInstance(instance)) {
                result.add(contractType.cast(instance));
            }
        }
        return Collections.unmodifiableList(result);
    }

    @Override
    public void unregister(String id) {
        Objects.requireNonNull(id, "id");
        ServiceHolder holder = servicesById.remove(id);
        if (holder == null) {
            return;
        }
        // 同步从按类型索引中移除
        List<ServiceHolder> holders = servicesByType.get(holder.contractType);
        if (holders != null) {
            holders.removeIf(h -> h.id.equals(id));
            if (holders.isEmpty()) {
                servicesByType.remove(holder.contractType);
            }
        }
    }
}

