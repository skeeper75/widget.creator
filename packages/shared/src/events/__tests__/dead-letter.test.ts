/**
 * Unit tests for Dead Letter Queue implementations
 *
 * Tests cover InMemoryDeadLetterQueue and DatabaseDeadLetterQueue
 * with mocked repository for DB variant.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  InMemoryDeadLetterQueue,
  DatabaseDeadLetterQueue,
} from '../dead-letter.js';
import type { DeadLetterRepository } from '../dead-letter.js';
import type { DomainEvent } from '../types.js';
import { createEventMetadata } from '../types.js';

function makeEvent(type: string = 'product.created'): DomainEvent {
  return {
    type: 'product.created',
    payload: { productId: 1, huniCode: 'HC001' },
    metadata: createEventMetadata('test'),
  } as DomainEvent;
}

describe('InMemoryDeadLetterQueue', () => {
  let dlq: InMemoryDeadLetterQueue;

  beforeEach(() => {
    dlq = new InMemoryDeadLetterQueue();
  });

  describe('save', () => {
    it('should store a failed event and return an ID', async () => {
      const event = makeEvent();
      const error = new Error('sync failed');

      const id = await dlq.save(event, 'shopby', error);

      expect(id).toBe(1);
    });

    it('should store correct fields', async () => {
      const event = makeEvent();
      const error = new Error('connection timeout');

      const id = await dlq.save(event, 'mes', error);
      const record = await dlq.getById(id);

      expect(record).not.toBeNull();
      expect(record!.eventType).toBe('product.created');
      expect(record!.eventPayload).toBe(event);
      expect(record!.adapterName).toBe('mes');
      expect(record!.errorMessage).toBe('connection timeout');
      expect(record!.retryCount).toBe(0);
      expect(record!.status).toBe('pending');
      expect(record!.replayedAt).toBeNull();
      expect(record!.createdAt).toBeInstanceOf(Date);
    });

    it('should auto-increment IDs', async () => {
      const event = makeEvent();
      const error = new Error('fail');

      const id1 = await dlq.save(event, 'shopby', error);
      const id2 = await dlq.save(event, 'mes', error);

      expect(id2).toBe(id1 + 1);
    });
  });

  describe('getPending', () => {
    it('should return only pending records', async () => {
      const event = makeEvent();
      const error = new Error('fail');

      const id1 = await dlq.save(event, 'shopby', error);
      await dlq.save(event, 'mes', error);
      await dlq.discard(id1);

      const pending = await dlq.getPending();

      expect(pending).toHaveLength(1);
      expect(pending[0].adapterName).toBe('mes');
    });

    it('should respect limit parameter', async () => {
      const event = makeEvent();
      const error = new Error('fail');

      await dlq.save(event, 'shopby', error);
      await dlq.save(event, 'mes', error);
      await dlq.save(event, 'edicus', error);

      const pending = await dlq.getPending(2);

      expect(pending).toHaveLength(2);
    });

    it('should sort by createdAt ascending', async () => {
      const event = makeEvent();
      const error = new Error('fail');

      await dlq.save(event, 'first', error);
      await dlq.save(event, 'second', error);

      const pending = await dlq.getPending();

      expect(pending[0].adapterName).toBe('first');
      expect(pending[1].adapterName).toBe('second');
    });
  });

  describe('replay', () => {
    it('should set status to replayed and set replayedAt', async () => {
      const event = makeEvent();
      const id = await dlq.save(event, 'shopby', new Error('fail'));

      const result = await dlq.replay(id);

      expect(result).toBe(event);

      const record = await dlq.getById(id);
      expect(record!.status).toBe('replayed');
      expect(record!.replayedAt).toBeInstanceOf(Date);
    });

    it('should return null for non-pending records', async () => {
      const event = makeEvent();
      const id = await dlq.save(event, 'shopby', new Error('fail'));
      await dlq.discard(id);

      const result = await dlq.replay(id);
      expect(result).toBeNull();
    });

    it('should return null for non-existent ID', async () => {
      const result = await dlq.replay(999);
      expect(result).toBeNull();
    });
  });

  describe('discard', () => {
    it('should set status to discarded', async () => {
      const event = makeEvent();
      const id = await dlq.save(event, 'shopby', new Error('fail'));

      await dlq.discard(id);

      const record = await dlq.getById(id);
      expect(record!.status).toBe('discarded');
    });
  });

  describe('getPendingCount', () => {
    it('should return correct count of pending records', async () => {
      const event = makeEvent();
      const error = new Error('fail');

      await dlq.save(event, 'shopby', error);
      await dlq.save(event, 'mes', error);
      const id3 = await dlq.save(event, 'edicus', error);
      await dlq.discard(id3);

      const count = await dlq.getPendingCount();
      expect(count).toBe(2);
    });

    it('should return 0 when empty', async () => {
      const count = await dlq.getPendingCount();
      expect(count).toBe(0);
    });
  });
});

describe('DatabaseDeadLetterQueue', () => {
  let dlq: DatabaseDeadLetterQueue;
  let mockRepo: {
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findPending: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    countPending: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepo = {
      insert: vi.fn(),
      update: vi.fn(),
      findPending: vi.fn(),
      findById: vi.fn(),
      countPending: vi.fn(),
    };
    dlq = new DatabaseDeadLetterQueue(mockRepo as DeadLetterRepository);
  });

  describe('save', () => {
    it('should call repository.insert with correct data', async () => {
      const event = makeEvent();
      const error = new Error('api error');
      mockRepo.insert.mockResolvedValue(42);

      const id = await dlq.save(event, 'shopby', error);

      expect(id).toBe(42);
      expect(mockRepo.insert).toHaveBeenCalledWith({
        eventType: 'product.created',
        eventPayload: event,
        adapterName: 'shopby',
        errorMessage: 'api error',
        retryCount: 0,
        status: 'pending',
      });
    });
  });

  describe('replay', () => {
    it('should update status to replayed and return event payload', async () => {
      const event = makeEvent();
      mockRepo.findById.mockResolvedValue({
        id: 1,
        eventType: 'product.created',
        eventPayload: event,
        adapterName: 'shopby',
        errorMessage: 'fail',
        retryCount: 0,
        status: 'pending',
        createdAt: new Date(),
        replayedAt: null,
      });
      mockRepo.update.mockResolvedValue(undefined);

      const result = await dlq.replay(1);

      expect(result).toBe(event);
      expect(mockRepo.update).toHaveBeenCalledWith(1, {
        status: 'replayed',
        replayedAt: expect.any(Date),
      });
    });

    it('should return null when record is not pending', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 1,
        status: 'discarded',
        eventPayload: makeEvent(),
      });

      const result = await dlq.replay(1);
      expect(result).toBeNull();
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('should return null when record does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const result = await dlq.replay(999);
      expect(result).toBeNull();
    });
  });

  describe('discard', () => {
    it('should call repository.update with discarded status', async () => {
      mockRepo.update.mockResolvedValue(undefined);

      await dlq.discard(5);

      expect(mockRepo.update).toHaveBeenCalledWith(5, { status: 'discarded' });
    });
  });

  describe('getPending', () => {
    it('should delegate to repository.findPending', async () => {
      const records = [{ id: 1, status: 'pending' }];
      mockRepo.findPending.mockResolvedValue(records);

      const result = await dlq.getPending(50);

      expect(result).toBe(records);
      expect(mockRepo.findPending).toHaveBeenCalledWith(50);
    });
  });

  describe('getPendingCount', () => {
    it('should delegate to repository.countPending', async () => {
      mockRepo.countPending.mockResolvedValue(7);

      const count = await dlq.getPendingCount();

      expect(count).toBe(7);
      expect(mockRepo.countPending).toHaveBeenCalled();
    });
  });
});
