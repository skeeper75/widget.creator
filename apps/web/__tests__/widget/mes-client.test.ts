/**
 * Tests for apps/web/app/api/_lib/services/mes-client.ts
 * SPEC-WB-006 FR-WB006-06 — MES dispatch with exponential backoff retry
 *
 * dispatchToMes:
 *   1. No-op when MES_API_URL not configured (status stays 'pending')
 *   2. Successful dispatch → updates mesStatus='sent' + mesOrderId
 *   3. HTTP failure → retries up to 3 times → updates mesStatus='failed'
 *   4. Network error (fetch throws) → retries up to 3 times → mesStatus='failed'
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '@widget-creator/shared/db';

// Mock @widget-creator/db — only wbOrders needed for this service
vi.mock('@widget-creator/db', () => {
  function createStubTable(name: string, columns: string[]) {
    const table: Record<string, unknown> = { _name: name };
    for (const col of columns) {
      table[col] = Symbol(`${name}.${col}`);
    }
    return table;
  }

  return {
    wbOrders: createStubTable('orders', [
      'id', 'orderCode', 'productId', 'mesStatus', 'mesOrderId', 'updatedAt',
    ]),
  };
});

// Save and restore process.env.MES_API_URL between tests
const ORIGINAL_MES_URL = process.env.MES_API_URL;

describe('dispatchToMes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Provide a default DB update mock
    (db.update as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }));
  });

  afterEach(() => {
    // Restore MES_API_URL after each test
    if (ORIGINAL_MES_URL === undefined) {
      delete process.env.MES_API_URL;
    } else {
      process.env.MES_API_URL = ORIGINAL_MES_URL;
    }
    vi.restoreAllMocks();
  });

  it('should no-op when MES_API_URL is not configured', async () => {
    delete process.env.MES_API_URL;
    const { dispatchToMes } = await import('../../app/api/_lib/services/mes-client.js');

    await dispatchToMes(1, 'ORD-20260226-0001', { productId: 42 });

    // Should not have called fetch or db.update
    expect(db.update).not.toHaveBeenCalled();
  });

  it('should update mesStatus=sent when MES responds ok', async () => {
    process.env.MES_API_URL = 'http://mes.internal';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ orderId: 'MES-ORDER-999' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { dispatchToMes } = await import('../../app/api/_lib/services/mes-client.js');
    await dispatchToMes(1, 'ORD-20260226-0001', { productId: 42 });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://mes.internal/orders',
      expect.objectContaining({ method: 'POST' }),
    );

    const updateMock = db.update as ReturnType<typeof vi.fn>;
    expect(updateMock).toHaveBeenCalledOnce();
    // Verify set was called with mesStatus='sent'
    const setCall = updateMock.mock.results[0].value.set as ReturnType<typeof vi.fn>;
    expect(setCall).toHaveBeenCalledWith(
      expect.objectContaining({ mesStatus: 'sent', mesOrderId: 'MES-ORDER-999' }),
    );
  });

  it('should update mesStatus=sent with null mesOrderId when response has no orderId', async () => {
    process.env.MES_API_URL = 'http://mes.internal';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}), // no orderId field
    });
    vi.stubGlobal('fetch', mockFetch);

    const { dispatchToMes } = await import('../../app/api/_lib/services/mes-client.js');
    await dispatchToMes(2, 'ORD-20260226-0002', { productId: 43 });

    const updateMock = db.update as ReturnType<typeof vi.fn>;
    const setCall = updateMock.mock.results[0].value.set as ReturnType<typeof vi.fn>;
    expect(setCall).toHaveBeenCalledWith(
      expect.objectContaining({ mesStatus: 'sent', mesOrderId: null }),
    );
  });

  it('should update mesStatus=sent when response body is not valid JSON', async () => {
    process.env.MES_API_URL = 'http://mes.internal';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')), // parse failure
    });
    vi.stubGlobal('fetch', mockFetch);

    const { dispatchToMes } = await import('../../app/api/_lib/services/mes-client.js');
    await dispatchToMes(3, 'ORD-20260226-0003', { productId: 44 });

    // Still marks as sent — body parse failure is non-critical
    const updateMock = db.update as ReturnType<typeof vi.fn>;
    const setCall = updateMock.mock.results[0].value.set as ReturnType<typeof vi.fn>;
    expect(setCall).toHaveBeenCalledWith(
      expect.objectContaining({ mesStatus: 'sent', mesOrderId: null }),
    );
  });

  it('should retry 3 times and set mesStatus=failed on persistent HTTP failure', async () => {
    process.env.MES_API_URL = 'http://mes.internal';

    // All 3 attempts return HTTP 500
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal('fetch', mockFetch);

    // Stub setTimeout to skip actual delays
    vi.useFakeTimers();

    const { dispatchToMes } = await import('../../app/api/_lib/services/mes-client.js');
    const dispatchPromise = dispatchToMes(4, 'ORD-20260226-0004', { productId: 45 });

    // Advance timers to skip retry delays
    await vi.runAllTimersAsync();
    await dispatchPromise;

    expect(mockFetch).toHaveBeenCalledTimes(3); // attempt 0, 1, 2

    const updateMock = db.update as ReturnType<typeof vi.fn>;
    expect(updateMock).toHaveBeenCalledOnce();
    const setCall = updateMock.mock.results[0].value.set as ReturnType<typeof vi.fn>;
    expect(setCall).toHaveBeenCalledWith(
      expect.objectContaining({ mesStatus: 'failed' }),
    );

    vi.useRealTimers();
  });

  it('should retry 3 times and set mesStatus=failed when fetch throws', async () => {
    process.env.MES_API_URL = 'http://mes.internal';

    // All 3 attempts throw a network error
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    vi.useFakeTimers();

    const { dispatchToMes } = await import('../../app/api/_lib/services/mes-client.js');
    const dispatchPromise = dispatchToMes(5, 'ORD-20260226-0005', { productId: 46 });

    await vi.runAllTimersAsync();
    await dispatchPromise;

    expect(mockFetch).toHaveBeenCalledTimes(3);

    const updateMock = db.update as ReturnType<typeof vi.fn>;
    const setCall = updateMock.mock.results[0].value.set as ReturnType<typeof vi.fn>;
    expect(setCall).toHaveBeenCalledWith(
      expect.objectContaining({ mesStatus: 'failed' }),
    );

    vi.useRealTimers();
  });

  it('should succeed on second attempt after first HTTP failure', async () => {
    process.env.MES_API_URL = 'http://mes.internal';

    // Attempt 0: fails, Attempt 1: succeeds
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ orderId: 'MES-RETRY-OK' }),
      });
    vi.stubGlobal('fetch', mockFetch);

    vi.useFakeTimers();

    const { dispatchToMes } = await import('../../app/api/_lib/services/mes-client.js');
    const dispatchPromise = dispatchToMes(6, 'ORD-20260226-0006', { productId: 47 });

    await vi.runAllTimersAsync();
    await dispatchPromise;

    expect(mockFetch).toHaveBeenCalledTimes(2);

    const updateMock = db.update as ReturnType<typeof vi.fn>;
    expect(updateMock).toHaveBeenCalledOnce();
    const setCall = updateMock.mock.results[0].value.set as ReturnType<typeof vi.fn>;
    expect(setCall).toHaveBeenCalledWith(
      expect.objectContaining({ mesStatus: 'sent', mesOrderId: 'MES-RETRY-OK' }),
    );

    vi.useRealTimers();
  });
});
