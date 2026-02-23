/**
 * Adapter Registry Implementation
 *
 * Manages registration, discovery, and health monitoring of integration adapters.
 */

import type { DomainEventType } from '../events/types.js';
import type {
  IntegrationAdapter,
  AdapterRegistry,
  AdapterStatus,
} from './types.js';

/**
 * In-memory implementation of Adapter Registry
 */
export class InMemoryAdapterRegistry implements AdapterRegistry {
  private readonly adapters: Map<string, IntegrationAdapter> = new Map();

  /**
   * Register an adapter
   * @throws Error if adapter with same name already registered
   */
  register(adapter: IntegrationAdapter): void {
    if (this.adapters.has(adapter.name)) {
      throw new Error(`Adapter '${adapter.name}' is already registered`);
    }
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Unregister an adapter by name
   */
  unregister(name: string): void {
    this.adapters.delete(name);
  }

  /**
   * Get an adapter by name
   */
  getAdapter(name: string): IntegrationAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * Get all registered adapters
   */
  getAllAdapters(): ReadonlyArray<IntegrationAdapter> {
    return Array.from(this.adapters.values());
  }

  /**
   * Get health status of all adapters
   */
  async getHealthStatus(): Promise<Record<string, AdapterStatus>> {
    const statusMap: Record<string, AdapterStatus> = {};

    for (const [name, adapter] of this.adapters) {
      try {
        // Run health check and get status
        await adapter.healthCheck();
        statusMap[name] = adapter.getStatus();
      } catch {
        // If health check throws, mark as unhealthy
        const currentStatus = adapter.getStatus();
        statusMap[name] = {
          ...currentStatus,
          healthy: false,
        };
      }
    }

    return statusMap;
  }

  /**
   * Get adapters subscribed to a specific event type
   */
  getAdaptersForEvent(eventType: DomainEventType): ReadonlyArray<IntegrationAdapter> {
    return Array.from(this.adapters.values()).filter((adapter) =>
      adapter.subscribedEvents.includes(eventType)
    );
  }

  /**
   * Get count of registered adapters
   */
  get count(): number {
    return this.adapters.size;
  }

  /**
   * Check if an adapter is registered
   */
  has(name: string): boolean {
    return this.adapters.has(name);
  }

  /**
   * Clear all registered adapters
   */
  clear(): void {
    this.adapters.clear();
  }
}

/**
 * Singleton adapter registry instance
 */
let globalRegistry: AdapterRegistry | null = null;

/**
 * Get the global adapter registry
 * @throws Error if registry has not been initialized
 */
export function getAdapterRegistry(): AdapterRegistry {
  if (!globalRegistry) {
    throw new Error('AdapterRegistry not initialized. Call initializeAdapterRegistry() first.');
  }
  return globalRegistry;
}

/**
 * Initialize the global adapter registry
 */
export function initializeAdapterRegistry(): AdapterRegistry {
  if (globalRegistry) {
    return globalRegistry;
  }
  globalRegistry = new InMemoryAdapterRegistry();
  return globalRegistry;
}

/**
 * Reset the global registry (for testing)
 */
export function resetAdapterRegistry(): void {
  if (globalRegistry instanceof InMemoryAdapterRegistry) {
    globalRegistry.clear();
  }
  globalRegistry = null;
}
