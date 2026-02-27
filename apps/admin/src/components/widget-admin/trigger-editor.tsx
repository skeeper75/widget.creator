'use client';

// @MX:NOTE: [AUTO] TriggerEditor — visual IF condition editor using react-querybuilder for constraint rules
// @MX:SPEC: SPEC-WA-001 FR-WA001-17, FR-WA001-19

import { useState } from 'react';
import type { RuleGroupType, Field } from 'react-querybuilder';
import QueryBuilder, { defaultOperators } from 'react-querybuilder';
import 'react-querybuilder/dist/query-builder.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

// Supported operators subset
const CONSTRAINT_OPERATORS = defaultOperators.filter((op) =>
  ['=', 'in', 'notIn', 'contains', 'beginsWith', 'endsWith'].includes(op.name),
);

// Map react-querybuilder operator names to DB triggerOperator values
export const OPERATOR_MAP: Record<string, string> = {
  '=': 'equals',
  in: 'in',
  notIn: 'not_in',
  contains: 'contains',
  beginsWith: 'beginsWith',
  endsWith: 'endsWith',
};

export interface TriggerCondition {
  triggerOptionKey: string;
  triggerOperator: string;
  triggerValues: string[];
  extraConditions: Record<string, unknown> | null;
}

interface OptionField {
  key: string;
  name: string;
}

interface TriggerEditorProps {
  optionFields: OptionField[];
  value: TriggerCondition;
  onChange: (condition: TriggerCondition) => void;
  mode?: 'simple' | 'advanced';
}

// Simple mode: single trigger row for basic users
function SimpleTriggerEditor({
  optionFields,
  value,
  onChange,
}: Omit<TriggerEditorProps, 'mode'>) {
  const [valInput, setValInput] = useState('');

  const updateField = (key: string) => {
    onChange({ ...value, triggerOptionKey: key });
  };
  const updateOperator = (op: string) => {
    onChange({ ...value, triggerOperator: op });
  };
  const addValue = () => {
    const v = valInput.trim();
    if (v && !value.triggerValues.includes(v)) {
      onChange({ ...value, triggerValues: [...value.triggerValues, v] });
      setValInput('');
    }
  };
  const removeValue = (v: string) => {
    onChange({ ...value, triggerValues: value.triggerValues.filter((x) => x !== v) });
  };

  return (
    <div className="space-y-3">
      <div className="font-medium text-sm text-muted-foreground">IF 조건</div>
      <div className="flex gap-2 flex-wrap items-center">
        <Select value={value.triggerOptionKey} onValueChange={updateField}>
          <SelectTrigger className="h-8 text-xs w-40">
            <SelectValue placeholder="옵션 선택" />
          </SelectTrigger>
          <SelectContent>
            {optionFields.map((f) => (
              <SelectItem key={f.key} value={f.key}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.triggerOperator} onValueChange={updateOperator}>
          <SelectTrigger className="h-8 text-xs w-28">
            <SelectValue placeholder="연산자" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equals">= (같음)</SelectItem>
            <SelectItem value="in">IN (포함)</SelectItem>
            <SelectItem value="not_in">NOT IN (제외)</SelectItem>
            <SelectItem value="contains">포함(문자)</SelectItem>
            <SelectItem value="beginsWith">시작</SelectItem>
            <SelectItem value="endsWith">끝</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex flex-wrap gap-1 items-center">
          {value.triggerValues.map((v) => (
            <Badge key={v} variant="secondary" className="text-xs gap-1">
              {v}
              <button type="button" onClick={() => removeValue(v)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={valInput}
            onChange={(e) => setValInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addValue();
              }
            }}
            placeholder="값 입력"
            className="h-8 text-xs w-32"
          />
          <Button type="button" size="sm" variant="outline" onClick={addValue} className="h-8 text-xs">
            +
          </Button>
        </div>
      </div>
    </div>
  );
}

// Advanced mode: uses react-querybuilder for AND/OR complex conditions
function AdvancedTriggerEditor({
  optionFields,
  value,
  onChange,
}: Omit<TriggerEditorProps, 'mode'>) {
  const fields: Field[] = optionFields.map((f) => ({
    name: f.key,
    label: f.name,
    operators: CONSTRAINT_OPERATORS,
  }));

  const [query, setQuery] = useState<RuleGroupType>(() => {
    // Initialize from value
    return {
      combinator: 'and',
      rules: value.triggerOptionKey
        ? [
            {
              field: value.triggerOptionKey,
              operator: Object.entries(OPERATOR_MAP).find(([, v]) => v === value.triggerOperator)?.[0] ?? '=',
              value: value.triggerValues.join(','),
            },
          ]
        : [],
    };
  });

  const handleQueryChange = (newQuery: RuleGroupType) => {
    setQuery(newQuery);
    // Convert back to TriggerCondition
    const rules = newQuery.rules;
    if (rules.length === 0) return;

    // First rule as primary trigger
    const firstRule = rules[0];
    if (!firstRule || !('field' in firstRule)) return;

    const triggerOperator = OPERATOR_MAP[firstRule.operator ?? '='] ?? 'equals';
    const rawValue = String(firstRule.value ?? '');
    const triggerValues = rawValue
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    // Remaining rules as extraConditions
    const extraRules = rules.slice(1);
    const extraConditions = extraRules.length > 0
      ? { combinator: newQuery.combinator, rules: extraRules }
      : null;

    onChange({
      triggerOptionKey: firstRule.field,
      triggerOperator,
      triggerValues,
      extraConditions,
    });
  };

  return (
    <div className="space-y-3">
      <div className="font-medium text-sm text-muted-foreground">IF 조건 (고급)</div>
      <div className="rounded-md border p-3 bg-muted/20 text-xs [&_.queryBuilder]:text-xs [&_.ruleGroup]:p-2 [&_.rule]:gap-1">
        <QueryBuilder
          fields={fields}
          query={query}
          onQueryChange={handleQueryChange}
          operators={CONSTRAINT_OPERATORS}
        />
      </div>
    </div>
  );
}

export function TriggerEditor({ optionFields, value, onChange, mode = 'simple' }: TriggerEditorProps) {
  return mode === 'simple'
    ? <SimpleTriggerEditor optionFields={optionFields} value={value} onChange={onChange} />
    : <AdvancedTriggerEditor optionFields={optionFields} value={value} onChange={onChange} />;
}
