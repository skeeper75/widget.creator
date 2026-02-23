/**
 * Test utilities for @testing-library/preact
 * Provides custom render functions and common test helpers
 */

import { render, type RenderResult } from '@testing-library/preact';
import type { ComponentChildren, VNode } from 'preact';
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

/**
 * Wrapper component for providing context in tests
 */
interface WrapperProps {
  children: ComponentChildren;
}

/**
 * Custom render function that can include providers
 */
export function renderWithProviders(
  ui: VNode,
  wrapper?: (props: WrapperProps) => VNode
): RenderResult {
  if (wrapper) {
    return render(ui, { wrapper });
  }
  return render(ui);
}

/**
 * Re-export everything from @testing-library/preact
 */
export * from '@testing-library/preact';

/**
 * Helper to wait for multiple conditions
 */
export async function waitForAll(
  conditions: Array<() => boolean>,
  timeout = 1000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (conditions.every((fn) => fn())) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error('Timeout waiting for all conditions to be met');
}

/**
 * Helper to create a mock function that tracks calls
 */
export function createMockFn<T extends (...args: unknown[]) => unknown>(): {
  mock: T;
  calls: Array<Parameters<T>>;
} {
  const calls: Array<Parameters<T>> = [];
  const mock = ((...args: Parameters<T>) => {
    calls.push(args);
  }) as T;
  return { mock, calls };
}

/**
 * Mock Shadow DOM container for testing
 */
export function createShadowRootMock(): {
  shadowRoot: ShadowRoot;
  container: HTMLDivElement;
} {
  const container = document.createElement('div');
  container.id = 'huni-widget-root';
  document.body.appendChild(container);

  const shadowRoot = container.attachShadow({ mode: 'open' });

  return { shadowRoot, container };
}

/**
 * Clean up shadow DOM mock
 */
export function cleanupShadowRootMock(container: HTMLDivElement): void {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
}

/**
 * Dispatch a custom event and return a promise that resolves
 * when the event handler has been called
 */
export async function dispatchAndWait(
  target: EventTarget,
  eventType: string,
  detail?: unknown
): Promise<void> {
  return new Promise((resolve) => {
    const listener = () => {
      target.removeEventListener(eventType, listener);
      resolve();
    };
    target.addEventListener(eventType, listener);
    target.dispatchEvent(new CustomEvent(eventType, { detail }));
  });
}

/**
 * Type helper for component props
 */
export type ComponentProps<T> = T extends (props: infer P) => unknown ? P : never;
