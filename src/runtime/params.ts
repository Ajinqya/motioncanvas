/**
 * Parameter schema DSL helpers for defining animation parameters
 * These create a schema format that our ParameterPanel can interpret
 */

/** Create a number parameter */
export function number(opts: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}) {
  return opts;
}

/** Create a color parameter */
export function color(opts: { value: string; label?: string }) {
  return opts;
}

/** Create a string parameter */
export function string(opts: { value: string; label?: string }) {
  return opts;
}

/** Create a select/dropdown parameter */
export function select(opts: {
  value: string;
  options: string[] | { label: string; value: string }[];
  label?: string;
}) {
  return opts;
}

/** Create a boolean toggle parameter */
export function boolean(opts: { value: boolean; label?: string }) {
  return opts;
}

/** Create a 2D vector parameter */
export function vector2(opts: {
  value: { x: number; y: number };
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}) {
  return opts;
}

/** Create a folder to group parameters */
export function folder(
  label: string,
  fields: Record<string, unknown>,
  opts?: { collapsed?: boolean }
) {
  return {
    [label]: {
      schema: fields,
      collapsed: opts?.collapsed ?? false,
    },
  };
}
