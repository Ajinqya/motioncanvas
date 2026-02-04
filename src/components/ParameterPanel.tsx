import { useState, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ParamSchema } from '../runtime/types';

interface ParameterPanelProps {
  schema: ParamSchema;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  title?: string;
}

// Type guards for parameter types
interface NumberParam {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

interface ColorParam {
  value: string;
  label?: string;
}

interface BooleanParam {
  value: boolean;
  label?: string;
}

interface SelectParam {
  value: string;
  options: string[] | { label: string; value: string }[];
  label?: string;
}

interface FolderParam {
  schema: Record<string, unknown>;
  collapsed?: boolean;
}

function isNumberParam(param: unknown): param is NumberParam {
  return (
    typeof param === 'object' &&
    param !== null &&
    'value' in param &&
    typeof (param as NumberParam).value === 'number' &&
    !('options' in param)
  );
}

function isColorParam(param: unknown): param is ColorParam {
  return (
    typeof param === 'object' &&
    param !== null &&
    'value' in param &&
    typeof (param as ColorParam).value === 'string' &&
    (param as ColorParam).value.startsWith('#')
  );
}

function isBooleanParam(param: unknown): param is BooleanParam {
  return (
    typeof param === 'object' &&
    param !== null &&
    'value' in param &&
    typeof (param as BooleanParam).value === 'boolean'
  );
}

function isSelectParam(param: unknown): param is SelectParam {
  return (
    typeof param === 'object' &&
    param !== null &&
    'value' in param &&
    'options' in param &&
    Array.isArray((param as SelectParam).options)
  );
}

function isLevaFolder(param: unknown): param is FolderParam {
  return (
    typeof param === 'object' &&
    param !== null &&
    'schema' in param &&
    typeof (param as FolderParam).schema === 'object'
  );
}

// Format parameter name for display
function formatLabel(key: string): string {
  // Convert camelCase to Title Case with spaces
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Number control component
function NumberControl({
  paramKey,
  param,
  value,
  onChange,
}: {
  paramKey: string;
  param: NumberParam;
  value: number;
  onChange: (value: number) => void;
}) {
  const min = param.min ?? 0;
  const max = param.max ?? 100;
  const step = param.step ?? 1;
  const label = param.label || formatLabel(paramKey);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground truncate max-w-[120px]">
          {label}
        </Label>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className="w-20 h-7 text-xs text-right bg-muted border-0"
        />
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
    </div>
  );
}

// Color control component
function ColorControl({
  paramKey,
  param,
  value,
  onChange,
}: {
  paramKey: string;
  param: ColorParam;
  value: string;
  onChange: (value: string) => void;
}) {
  const label = param.label || formatLabel(paramKey);

  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs text-muted-foreground truncate max-w-[120px]">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded border border-border cursor-pointer relative overflow-hidden"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 h-7 text-xs font-mono bg-muted border-0"
        />
      </div>
    </div>
  );
}

// Boolean control component
function BooleanControl({
  paramKey,
  param,
  value,
  onChange,
}: {
  paramKey: string;
  param: BooleanParam;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const label = param.label || formatLabel(paramKey);

  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs text-muted-foreground truncate max-w-[140px]">
        {label}
      </Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

// Select control component
function SelectControl({
  paramKey,
  param,
  value,
  onChange,
}: {
  paramKey: string;
  param: SelectParam;
  value: string;
  onChange: (value: string) => void;
}) {
  const label = param.label || formatLabel(paramKey);
  const options = param.options.map((opt) =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs text-muted-foreground truncate max-w-[120px]">
        {label}
      </Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 px-2 text-xs rounded-md bg-muted border-0 text-foreground"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Folder/section component
function FolderSection({
  name,
  schema,
  values,
  onChange,
  defaultOpen = true,
}: {
  name: string;
  schema: Record<string, unknown>;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        {name}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-4 border-l border-border ml-2 space-y-4 pb-2">
          <ParameterControls
            schema={schema}
            values={values}
            onChange={onChange}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Recursive parameter controls renderer
function ParameterControls({
  schema,
  values,
  onChange,
}: {
  schema: Record<string, unknown>;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const renderControl = (key: string, param: unknown) => {
    const currentValue = values[key];

    // Check for Leva folder (created by our folder() helper)
    if (isLevaFolder(param)) {
      return (
        <FolderSection
          key={key}
          name={key}
          schema={param.schema}
          values={values}
          onChange={onChange}
          defaultOpen={!param.collapsed}
        />
      );
    }

    // Number parameter
    if (isNumberParam(param)) {
      return (
        <NumberControl
          key={key}
          paramKey={key}
          param={param}
          value={(currentValue as number) ?? param.value}
          onChange={(v) => onChange(key, v)}
        />
      );
    }

    // Color parameter (check before generic string)
    if (isColorParam(param)) {
      return (
        <ColorControl
          key={key}
          paramKey={key}
          param={param}
          value={(currentValue as string) ?? param.value}
          onChange={(v) => onChange(key, v)}
        />
      );
    }

    // Boolean parameter
    if (isBooleanParam(param)) {
      return (
        <BooleanControl
          key={key}
          paramKey={key}
          param={param}
          value={(currentValue as boolean) ?? param.value}
          onChange={(v) => onChange(key, v)}
        />
      );
    }

    // Select parameter
    if (isSelectParam(param)) {
      return (
        <SelectControl
          key={key}
          paramKey={key}
          param={param}
          value={(currentValue as string) ?? param.value}
          onChange={(v) => onChange(key, v)}
        />
      );
    }

    return null;
  };

  return (
    <>
      {Object.entries(schema).map(([key, param]) => renderControl(key, param))}
    </>
  );
}

export function ParameterPanel({
  schema,
  values,
  onChange,
  title = 'Parameters',
}: ParameterPanelProps) {
  return (
    <div className="w-full">
      <h3 className="text-sm font-medium mb-4">{title}</h3>
      <div className="space-y-4">
        <ParameterControls schema={schema} values={values} onChange={onChange} />
      </div>
    </div>
  );
}

// Hook to manage parameter state (replacement for useControls from Leva)
export function useParameters(_schema: ParamSchema, defaults: Record<string, unknown>) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    // Initialize with defaults
    return { ...defaults };
  });

  const handleChange = useCallback((key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { values, onChange: handleChange };
}

/**
 * Convert our param schema to a flat schema for the panel.
 * This unwraps Leva folders while preserving the structure.
 */
export function schemaToLeva(schema: ParamSchema): Record<string, unknown> {
  // The schema is already in the correct format
  return schema as Record<string, unknown>;
}
