/**
 * Button Primitive Component
 * Action button with multiple variants
 * @see SPEC-WIDGET-SDK-001 Section 4.3.7
 */

import { FunctionalComponent, ComponentChildren } from 'preact';

export interface ButtonProps {
  /** Button text */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Style variant */
  variant: 'primary' | 'secondary' | 'outline' | 'upload' | 'editor';
  /** Whether button is disabled */
  disabled?: boolean;
  /** Whether button shows loading state */
  loading?: boolean;
  /** Optional icon */
  icon?: ComponentChildren;
  /** Whether button takes full width */
  fullWidth?: boolean;
}

/**
 * Button - Action button component
 *
 * Variants:
 * - primary: Solid background (#5538B6), white text
 * - secondary: Light background (#F6F6F6), dark text
 * - outline: Border only (#CACACA), transparent background
 * - upload: Primary with upload icon
 * - editor: Accent color (#F0831E) with editor icon
 */
export const Button: FunctionalComponent<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
}) => {
  const showUploadIcon = variant === 'upload';
  const showEditorIcon = variant === 'editor';

  return (
    <button
      type="button"
      class={`button button--${variant} ${fullWidth ? 'button--full-width' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      {loading && <span class="button__spinner" aria-hidden="true" />}
      {!loading && icon}
      {!loading && showUploadIcon && (
        <svg class="button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17,8 12,3 7,8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      )}
      {!loading && showEditorIcon && (
        <svg class="button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      )}
      <span class="button__label">{label}</span>
    </button>
  );
};

export default Button;
