/**
 * Optical Auto Layout - React Components
 * CSS Flexbox + Optical Alignment 통합 컴포넌트
 */

import React, { createContext, useContext, CSSProperties, ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

interface OpticalCorrection {
  offsetX: number;       // 비율 (0.08 = 8%)
  offsetY: number;
  sizeMultiplier: number;
}

type ShapeType = 
  | 'square' 
  | 'circle' 
  | 'triangle-right' 
  | 'triangle-left' 
  | 'triangle-up' 
  | 'triangle-down' 
  | 'diamond' 
  | 'star' 
  | 'hexagon'
  | 'heart';

type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
type JustifyContent = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
type AlignItems = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';

// =============================================================================
// Shape Corrections Database
// =============================================================================

const SHAPE_CORRECTIONS: Record<ShapeType, OpticalCorrection> = {
  'square':         { offsetX: 0,     offsetY: 0,     sizeMultiplier: 1.00 },
  'circle':         { offsetX: 0,     offsetY: 0,     sizeMultiplier: 1.13 },
  'triangle-right': { offsetX: 0.08,  offsetY: 0,     sizeMultiplier: 1.27 },
  'triangle-left':  { offsetX: -0.08, offsetY: 0,     sizeMultiplier: 1.27 },
  'triangle-up':    { offsetX: 0,     offsetY: -0.05, sizeMultiplier: 1.27 },
  'triangle-down':  { offsetX: 0,     offsetY: 0.05,  sizeMultiplier: 1.27 },
  'diamond':        { offsetX: 0,     offsetY: 0,     sizeMultiplier: 1.15 },
  'star':           { offsetX: 0,     offsetY: 0,     sizeMultiplier: 1.20 },
  'hexagon':        { offsetX: 0,     offsetY: 0,     sizeMultiplier: 1.08 },
  'heart':          { offsetX: 0,     offsetY: 0.03,  sizeMultiplier: 1.18 },
};

// =============================================================================
// Context
// =============================================================================

interface OpticalContextValue {
  correctionStrength: number;
  enableSizeCompensation: boolean;
  enablePositionCorrection: boolean;
}

const OpticalContext = createContext<OpticalContextValue>({
  correctionStrength: 1.0,
  enableSizeCompensation: true,
  enablePositionCorrection: true,
});

// =============================================================================
// Provider Component
// =============================================================================

interface OpticalProviderProps {
  correctionStrength?: number;
  enableSizeCompensation?: boolean;
  enablePositionCorrection?: boolean;
  children: ReactNode;
}

export function OpticalProvider({
  correctionStrength = 1.0,
  enableSizeCompensation = true,
  enablePositionCorrection = true,
  children,
}: OpticalProviderProps) {
  return (
    <OpticalContext.Provider
      value={{
        correctionStrength,
        enableSizeCompensation,
        enablePositionCorrection,
      }}
    >
      {children}
    </OpticalContext.Provider>
  );
}

// =============================================================================
// OpticalBox - Auto Layout Container
// =============================================================================

interface OpticalBoxProps {
  direction?: FlexDirection;
  justify?: JustifyContent;
  align?: AlignItems;
  gap?: number;
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  wrap?: boolean;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export function OpticalBox({
  direction = 'row',
  justify = 'flex-start',
  align = 'stretch',
  gap = 0,
  padding = 0,
  wrap = false,
  children,
  style,
  className,
}: OpticalBoxProps) {
  const paddingStyle = typeof padding === 'number'
    ? { padding }
    : {
        paddingTop: padding.top ?? 0,
        paddingRight: padding.right ?? 0,
        paddingBottom: padding.bottom ?? 0,
        paddingLeft: padding.left ?? 0,
      };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: direction,
        justifyContent: justify,
        alignItems: align,
        gap,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        ...paddingStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// =============================================================================
// OpticalItem - Optically Corrected Item
// =============================================================================

interface OpticalItemProps {
  shape?: ShapeType;
  size?: number;
  enableCorrection?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export function OpticalItem({
  shape = 'square',
  size = 24,
  enableCorrection = true,
  children,
  style,
  className,
}: OpticalItemProps) {
  const context = useContext(OpticalContext);
  const correction = SHAPE_CORRECTIONS[shape] || SHAPE_CORRECTIONS['square'];

  let correctedSize = size;
  let transform = '';

  if (enableCorrection && context.correctionStrength > 0) {
    // Size compensation
    if (context.enableSizeCompensation) {
      const sizeAdjust = 1 + (correction.sizeMultiplier - 1) * context.correctionStrength;
      correctedSize = size * sizeAdjust;
    }

    // Position offset
    if (context.enablePositionCorrection) {
      const offsetX = size * correction.offsetX * context.correctionStrength;
      const offsetY = size * correction.offsetY * context.correctionStrength;
      if (offsetX !== 0 || offsetY !== 0) {
        transform = `translate(${offsetX}px, ${offsetY}px)`;
      }
    }
  }

  return (
    <div
      className={className}
      style={{
        width: correctedSize,
        height: correctedSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform,
        ...style,
      }}
      data-optical-shape={shape}
      data-original-size={size}
      data-corrected-size={correctedSize.toFixed(1)}
    >
      {children}
    </div>
  );
}

// =============================================================================
// Preset Shape Components
// =============================================================================

interface ShapeIconProps {
  size?: number;
  color?: string;
  style?: CSSProperties;
}

export function SquareIcon({ size = 24, color = 'currentColor', style }: ShapeIconProps) {
  return (
    <OpticalItem shape="square" size={size}>
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: color,
          borderRadius: 2,
          ...style,
        }}
      />
    </OpticalItem>
  );
}

export function CircleIcon({ size = 24, color = 'currentColor', style }: ShapeIconProps) {
  return (
    <OpticalItem shape="circle" size={size}>
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: color,
          borderRadius: '50%',
          ...style,
        }}
      />
    </OpticalItem>
  );
}

export function PlayIcon({ size = 24, color = 'currentColor', style }: ShapeIconProps) {
  return (
    <OpticalItem shape="triangle-right" size={size}>
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: `${size * 0.4}px solid ${color}`,
          borderTop: `${size * 0.3}px solid transparent`,
          borderBottom: `${size * 0.3}px solid transparent`,
          ...style,
        }}
      />
    </OpticalItem>
  );
}

export function StarIcon({ size = 24, color = 'currentColor', style }: ShapeIconProps) {
  return (
    <OpticalItem shape="star" size={size}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={color}
        style={style}
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </OpticalItem>
  );
}

export function HeartIcon({ size = 24, color = 'currentColor', style }: ShapeIconProps) {
  return (
    <OpticalItem shape="heart" size={size}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={color}
        style={style}
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </OpticalItem>
  );
}

// =============================================================================
// Demo Component
// =============================================================================

export function OpticalLayoutDemo() {
  const [correctionEnabled, setCorrectionEnabled] = React.useState(true);
  const [strength, setStrength] = React.useState(1.0);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h2>Optical Auto Layout Demo</h2>
      
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={correctionEnabled}
            onChange={(e) => setCorrectionEnabled(e.target.checked)}
          />
          Enable Optical Correction
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Strength: {strength.toFixed(1)}
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={strength}
            onChange={(e) => setStrength(parseFloat(e.target.value))}
            style={{ width: 200 }}
          />
        </label>
      </div>

      <OpticalProvider
        correctionStrength={correctionEnabled ? strength : 0}
        enableSizeCompensation={correctionEnabled}
        enablePositionCorrection={correctionEnabled}
      >
        <div style={{ marginBottom: 32 }}>
          <h3>Icon Toolbar</h3>
          <OpticalBox
            direction="row"
            justify="center"
            align="center"
            gap={16}
            padding={16}
            style={{
              backgroundColor: '#f5f5f5',
              borderRadius: 8,
              width: 'fit-content',
            }}
          >
            <SquareIcon size={24} color="#333" />
            <CircleIcon size={24} color="#333" />
            <PlayIcon size={24} color="#333" />
            <StarIcon size={24} color="#333" />
            <HeartIcon size={24} color="#333" />
          </OpticalBox>
        </div>

        <div style={{ marginBottom: 32 }}>
          <h3>Comparison</h3>
          <div style={{ display: 'flex', gap: 32 }}>
            <div>
              <p style={{ marginBottom: 8, color: '#666' }}>Without Correction:</p>
              <OpticalProvider correctionStrength={0}>
                <OpticalBox
                  direction="row"
                  justify="center"
                  align="center"
                  gap={16}
                  padding={16}
                  style={{
                    backgroundColor: '#fee',
                    borderRadius: 8,
                  }}
                >
                  <SquareIcon size={32} color="#c00" />
                  <CircleIcon size={32} color="#c00" />
                  <PlayIcon size={32} color="#c00" />
                </OpticalBox>
              </OpticalProvider>
            </div>
            
            <div>
              <p style={{ marginBottom: 8, color: '#666' }}>With Correction:</p>
              <OpticalBox
                direction="row"
                justify="center"
                align="center"
                gap={16}
                padding={16}
                style={{
                  backgroundColor: '#efe',
                  borderRadius: 8,
                }}
              >
                <SquareIcon size={32} color="#0a0" />
                <CircleIcon size={32} color="#0a0" />
                <PlayIcon size={32} color="#0a0" />
              </OpticalBox>
            </div>
          </div>
        </div>
      </OpticalProvider>
    </div>
  );
}

export default {
  OpticalProvider,
  OpticalBox,
  OpticalItem,
  SquareIcon,
  CircleIcon,
  PlayIcon,
  StarIcon,
  HeartIcon,
  OpticalLayoutDemo,
  SHAPE_CORRECTIONS,
};
