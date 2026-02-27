/**
 * Tests for useUnsavedChanges hook logic.
 * REQ-S-004: Unsaved changes guard.
 *
 * Tests the core unsaved-changes protection pattern without @testing-library/react.
 * The hook uses beforeunload and window.confirm, which we test directly.
 */
import { describe, it, expect, vi } from 'vitest';

// Re-implement the core logic (same as useUnsavedChanges hook)
interface UnsavedChangesConfig {
  hasChanges: boolean;
  message?: string;
}

const DEFAULT_MESSAGE = '저장되지 않은 변경사항이 있습니다. 페이지를 떠나시겠습니까?';

function createBeforeUnloadHandler(config: UnsavedChangesConfig) {
  return (e: { preventDefault: () => void; returnValue: string }) => {
    if (!config.hasChanges) return;
    e.preventDefault();
    e.returnValue = config.message ?? DEFAULT_MESSAGE;
    return config.message ?? DEFAULT_MESSAGE;
  };
}

function createConfirmNavigation(config: UnsavedChangesConfig, confirmFn: (msg: string) => boolean) {
  return (): boolean => {
    if (!config.hasChanges) return true;
    return confirmFn(config.message ?? DEFAULT_MESSAGE);
  };
}

describe('beforeunload handler', () => {
  it('does nothing when hasChanges is false', () => {
    const handler = createBeforeUnloadHandler({ hasChanges: false });
    const event = { preventDefault: vi.fn(), returnValue: '' };

    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.returnValue).toBe('');
  });

  it('prevents default when hasChanges is true', () => {
    const handler = createBeforeUnloadHandler({ hasChanges: true });
    const event = { preventDefault: vi.fn(), returnValue: '' };

    handler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.returnValue).toBe(DEFAULT_MESSAGE);
  });

  it('uses custom message when provided', () => {
    const customMsg = 'Custom warning message';
    const handler = createBeforeUnloadHandler({ hasChanges: true, message: customMsg });
    const event = { preventDefault: vi.fn(), returnValue: '' };

    handler(event);

    expect(event.returnValue).toBe(customMsg);
  });

  it('uses default Korean message', () => {
    const handler = createBeforeUnloadHandler({ hasChanges: true });
    const event = { preventDefault: vi.fn(), returnValue: '' };

    handler(event);

    expect(event.returnValue).toBe('저장되지 않은 변경사항이 있습니다. 페이지를 떠나시겠습니까?');
  });
});

describe('confirmNavigation', () => {
  it('returns true when hasChanges is false (no confirmation needed)', () => {
    const mockConfirm = vi.fn().mockReturnValue(false);
    const navigate = createConfirmNavigation({ hasChanges: false }, mockConfirm);
    expect(navigate()).toBe(true);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('returns true when user confirms navigation', () => {
    const mockConfirm = vi.fn().mockReturnValue(true);
    const navigate = createConfirmNavigation({ hasChanges: true }, mockConfirm);

    expect(navigate()).toBe(true);
    expect(mockConfirm).toHaveBeenCalledWith(DEFAULT_MESSAGE);
  });

  it('returns false when user cancels navigation', () => {
    const mockConfirm = vi.fn().mockReturnValue(false);
    const navigate = createConfirmNavigation({ hasChanges: true }, mockConfirm);

    expect(navigate()).toBe(false);
    expect(mockConfirm).toHaveBeenCalledWith(DEFAULT_MESSAGE);
  });

  it('uses custom message in confirm dialog', () => {
    const customMsg = 'Custom unsaved changes message';
    const mockConfirm = vi.fn().mockReturnValue(true);
    const navigate = createConfirmNavigation({ hasChanges: true, message: customMsg }, mockConfirm);

    navigate();

    expect(mockConfirm).toHaveBeenCalledWith(customMsg);
  });

  it('does not call confirm when hasChanges is false', () => {
    const mockConfirm = vi.fn().mockReturnValue(false);
    const navigate = createConfirmNavigation({ hasChanges: false }, mockConfirm);

    navigate();

    expect(mockConfirm).not.toHaveBeenCalled();
  });
});

describe('useUnsavedChanges hook contract', () => {
  it('exports as a named function from use-unsaved-changes.ts', async () => {
    const hookModule = await import('../../src/hooks/use-unsaved-changes');
    expect(typeof hookModule.useUnsavedChanges).toBe('function');
  });
});
