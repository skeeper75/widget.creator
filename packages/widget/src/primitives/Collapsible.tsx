/**
 * Collapsible Primitive Component
 * Expandable/collapsible section component
 * @see SPEC-WIDGET-SDK-001 Section 4.3.4
 */

import { h, FunctionalComponent, ComponentChildren } from 'preact';
import { useState, useCallback } from 'preact/hooks';

export interface CollapsibleProps {
  /** Section title */
  title: string;
  /** Whether section is initially open */
  defaultOpen?: boolean;
  /** Children content */
  children: ComponentChildren;
  /** Layout variant */
  variant: 'title-bar';
  /** Optional badge count (e.g., selected sub-options count) */
  badge?: number;
}

/**
 * Collapsible - Expandable section component
 *
 * Variants:
 * - title-bar: Header bar with open/close chevron toggle, optional badge
 */
export const Collapsible: FunctionalComponent<CollapsibleProps> = ({
  title,
  defaultOpen = false,
  children,
  variant = 'title-bar',
  badge,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <div class={`collapsible collapsible--${variant}`}>
      <button
        type="button"
        class={`collapsible__header ${isOpen ? 'collapsible__header--open' : ''}`}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls={`collapsible-content-${title.replace(/\s+/g, '-')}`}
      >
        <span class="collapsible__title">{title}</span>
        {badge !== undefined && badge > 0 && (
          <span class="collapsible__badge">{badge}</span>
        )}
        <span class="collapsible__chevron" aria-hidden="true">
          {isOpen ? '▼' : '▶'}
        </span>
      </button>
      {isOpen && (
        <div
          id={`collapsible-content-${title.replace(/\s+/g, '-')}`}
          class="collapsible__content"
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default Collapsible;
