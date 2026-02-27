import { eq } from 'drizzle-orm';
import { db } from '@widget-creator/shared/db';
import { wbOrders } from '@widget-creator/db';

// @MX:WARN: [AUTO] Fire-and-forget MES dispatch — failure silently updates DB status
// @MX:REASON: MES dispatch is async; failures must be tracked in wbOrders.mesStatus to prevent data loss
// @MX:SPEC: SPEC-WB-006 FR-WB006-06

const RETRY_DELAYS_MS = [500, 1000, 2000];

/**
 * Dispatch order to MES (Manufacturing Execution System) with 3-retry exponential backoff.
 * This function is fire-and-forget — callers should not await it.
 * Updates wbOrders.mesStatus to 'sent' on success or 'failed' after all retries exhaust.
 */
export async function dispatchToMes(
  orderId: number,
  orderCode: string,
  payload: unknown,
): Promise<void> {
  const MES_URL = process.env.MES_API_URL;
  if (!MES_URL) {
    // MES not configured — skip dispatch, status remains 'pending'
    return;
  }

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${MES_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        let mesOrderId: string | null = null;
        try {
          const data = (await res.json()) as { orderId?: string };
          mesOrderId = data.orderId ?? null;
        } catch {
          // Response body parse failure is non-critical
        }

        await db
          .update(wbOrders)
          .set({ mesStatus: 'sent', mesOrderId, updatedAt: new Date() })
          .where(eq(wbOrders.id, orderId));

        console.info(`[MES] Order ${orderCode} dispatched successfully. mesOrderId=${mesOrderId}`);
        return;
      }

      console.warn(`[MES] Order ${orderCode} attempt ${attempt + 1} failed with HTTP ${res.status}`);
    } catch (err) {
      console.warn(`[MES] Order ${orderCode} attempt ${attempt + 1} threw:`, err);
    }

    if (attempt < 2) {
      await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }

  // All retries failed
  console.error(`[MES] Order ${orderCode} all retries exhausted. Setting mesStatus='failed'.`);
  await db
    .update(wbOrders)
    .set({ mesStatus: 'failed', updatedAt: new Date() })
    .where(eq(wbOrders.id, orderId));
}
