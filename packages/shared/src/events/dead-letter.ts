/**
 * Dead Letter Queue for failed events
 *
 * Stores events that have exceeded retry attempts for manual inspection and replay.
 * Database-backed for persistence across application restarts.
 */

import type { DomainEvent } from './types.js';

/**
 * Status of a dead letter entry
 */
export type DeadLetterStatus = 'pending' | 'replayed' | 'discarded';

/**
 * Dead letter record structure
 */
export interface DeadLetterRecord {
  id: number;
  eventType: string;
  eventPayload: DomainEvent;
  adapterName: string;
  errorMessage: string;
  retryCount: number;
  status: DeadLetterStatus;
  createdAt: Date;
  replayedAt: Date | null;
}

/**
 * Dead Letter Queue interface
 */
export interface DeadLetterQueue {
  /**
   * Save a failed event to the dead letter queue
   */
  save(event: DomainEvent, adapterName: string, error: Error): Promise<number>;

  /**
   * Replay a specific dead letter entry
   * Returns the stored event for re-processing
   */
  replay(id: number): Promise<DomainEvent | null>;

  /**
   * Discard a dead letter entry
   */
  discard(id: number): Promise<void>;

  /**
   * Get all pending dead letter entries
   */
  getPending(limit?: number): Promise<DeadLetterRecord[]>;

  /**
   * Get a specific dead letter entry by ID
   */
  getById(id: number): Promise<DeadLetterRecord | null>;

  /**
   * Get count of pending dead letters
   */
  getPendingCount(): Promise<number>;
}

/**
 * Database operations interface for dead letter queue
 * This should be implemented with Drizzle ORM in the actual application
 */
export interface DeadLetterRepository {
  insert(data: {
    eventType: string;
    eventPayload: DomainEvent;
    adapterName: string;
    errorMessage: string;
    retryCount: number;
    status: DeadLetterStatus;
  }): Promise<number>;

  update(id: number, data: Partial<{
    status: DeadLetterStatus;
    replayedAt: Date;
  }>): Promise<void>;

  findPending(limit: number): Promise<DeadLetterRecord[]>;

  findById(id: number): Promise<DeadLetterRecord | null>;

  countPending(): Promise<number>;
}

/**
 * In-memory Dead Letter Queue implementation
 * Useful for testing and development
 */
export class InMemoryDeadLetterQueue implements DeadLetterQueue {
  private records: Map<number, DeadLetterRecord> = new Map();
  private nextId = 1;

  async save(event: DomainEvent, adapterName: string, error: Error): Promise<number> {
    const id = this.nextId++;
    const record: DeadLetterRecord = {
      id,
      eventType: event.type,
      eventPayload: event,
      adapterName,
      errorMessage: error.message,
      retryCount: 0,
      status: 'pending',
      createdAt: new Date(),
      replayedAt: null,
    };
    this.records.set(id, record);
    return id;
  }

  async replay(id: number): Promise<DomainEvent | null> {
    const record = this.records.get(id);
    if (!record || record.status !== 'pending') {
      return null;
    }

    record.status = 'replayed';
    record.replayedAt = new Date();
    return record.eventPayload;
  }

  async discard(id: number): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      record.status = 'discarded';
    }
  }

  async getPending(limit = 100): Promise<DeadLetterRecord[]> {
    const pending = Array.from(this.records.values())
      .filter((r) => r.status === 'pending')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit);
    return pending;
  }

  async getById(id: number): Promise<DeadLetterRecord | null> {
    return this.records.get(id) ?? null;
  }

  async getPendingCount(): Promise<number> {
    return Array.from(this.records.values()).filter((r) => r.status === 'pending').length;
  }
}

/**
 * Database-backed Dead Letter Queue implementation
 * Uses the injected repository for persistence
 */
export class DatabaseDeadLetterQueue implements DeadLetterQueue {
  constructor(private readonly repository: DeadLetterRepository) {}

  async save(event: DomainEvent, adapterName: string, error: Error): Promise<number> {
    return this.repository.insert({
      eventType: event.type,
      eventPayload: event,
      adapterName,
      errorMessage: error.message,
      retryCount: 0,
      status: 'pending',
    });
  }

  async replay(id: number): Promise<DomainEvent | null> {
    const record = await this.repository.findById(id);
    if (!record || record.status !== 'pending') {
      return null;
    }

    await this.repository.update(id, {
      status: 'replayed',
      replayedAt: new Date(),
    });

    return record.eventPayload;
  }

  async discard(id: number): Promise<void> {
    await this.repository.update(id, {
      status: 'discarded',
    });
  }

  async getPending(limit = 100): Promise<DeadLetterRecord[]> {
    return this.repository.findPending(limit);
  }

  async getById(id: number): Promise<DeadLetterRecord | null> {
    return this.repository.findById(id);
  }

  async getPendingCount(): Promise<number> {
    return this.repository.countPending();
  }
}
