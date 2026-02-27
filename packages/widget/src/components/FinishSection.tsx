/**
 * FinishSection Domain Component
 * Collapsible section for post-process options
 * @see SPEC-WIDGET-SDK-001 Section 4.4.6
 */

import { FunctionalComponent } from 'preact';
import { Collapsible, ToggleGroup, type ToggleGroupItem } from '../primitives';
import type { PostProcessGroup } from '../types';

export interface FinishSectionProps {
  /** Post-process option groups (박, 형압, 오시, 미싱, 가변, 귀돌이) */
  groups: PostProcessGroup[];
  /** Option change handler */
  onOptionChange: (groupKey: string, code: string) => void;
}

/**
 * FinishSection - Collapsible post-process options section
 * Renders: Collapsible(variant='title-bar') wrapping nested ToggleGroup/Select sub-components
 * Data source: option_definitions WHERE option_class = 'post_process'
 * Badge shows count of selected post-process options
 */
export const FinishSection: FunctionalComponent<FinishSectionProps> = ({
  groups,
  onOptionChange,
}) => {
  // Count selected options for badge
  const selectedCount = groups.filter((g) => g.selectedCode !== null).length;

  return (
    <Collapsible
      title="후가공"
      variant="title-bar"
      defaultOpen={false}
      badge={selectedCount}
    >
      <div class="finish-section__content">
        {groups.map((group) => {
          const items: ToggleGroupItem[] = [
            { code: '', name: '없음', disabled: false },
            ...group.options.map((opt) => ({
              code: opt.code,
              name: opt.name,
              disabled: opt.disabled,
            })),
          ];

          return (
            <div key={group.key} class="finish-section__group">
              <ToggleGroup
                optionKey={`finish-${group.key}`}
                label={group.label}
                items={items}
                value={group.selectedCode ?? ''}
                onChange={(code) => onOptionChange(group.key, code)}
                variant="compact"
                required={false}
              />
            </div>
          );
        })}
      </div>
    </Collapsible>
  );
};

export default FinishSection;
