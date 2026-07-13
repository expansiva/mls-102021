/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_blank"/>

/** Deterministic TypeScript syntax checks available even when Monaco is unavailable. */
export function syntaxDiagnostics(content: string): string[] {
  const errors: string[] = [];
  content.split('\n').forEach((line, index) => {
    if (/\?\?[^()]*(\|\||&&)|(\|\||&&)[^()]*\?\?/u.test(line)) {
      errors.push(`TS5076: line ${index + 1}: '??' and '||'/'&&' operations cannot be mixed without parentheses`);
    }
  });
  return errors;
}
