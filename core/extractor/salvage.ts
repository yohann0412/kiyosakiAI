/**
 * Recover usable JSON from a response that was cut off mid-way (the model hit
 * its output cap on a very long table). We keep everything up to the last
 * complete value and close the open arrays/objects, so the user still gets
 * the rows that were read.
 */
export function salvageJson(text: string): unknown | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  const src = text.slice(start);

  try {
    return JSON.parse(src);
  } catch {
    // fall through to repair
  }

  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  // Position just after the last complete value, with the stack at that point.
  let safeEnd = -1;
  let safeStack: string[] = [];
  // Inside an object we may only cut after a value, never after a key.
  let expectingValue: boolean[] = [];

  const markSafe = (pos: number) => {
    safeEnd = pos;
    safeStack = stack.slice();
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') {
        inString = false;
        const top = stack[stack.length - 1];
        if (top === "[") markSafe(i + 1);
        else if (top === "{" && expectingValue[expectingValue.length - 1]) {
          expectingValue[expectingValue.length - 1] = false;
          markSafe(i + 1);
        }
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{" || ch === "[") {
      stack.push(ch);
      expectingValue.push(false);
    } else if (ch === "}" || ch === "]") {
      stack.pop();
      expectingValue.pop();
      if (stack.length === 0) {
        markSafe(i + 1);
        break;
      }
      if (stack[stack.length - 1] === "{") expectingValue[expectingValue.length - 1] = false;
      markSafe(i + 1);
    } else if (ch === ":") {
      if (stack[stack.length - 1] === "{") expectingValue[expectingValue.length - 1] = true;
    } else if (ch === ",") {
      // A comma ends a bare literal (number, true, false, null).
      const top = stack[stack.length - 1];
      if (top === "[" || (top === "{" && expectingValue[expectingValue.length - 1])) {
        if (top === "{") expectingValue[expectingValue.length - 1] = false;
        markSafe(i);
      }
    }
  }

  if (safeEnd < 0) return null;
  let repaired = src.slice(0, safeEnd).replace(/,\s*$/, "");
  for (let i = safeStack.length - 1; i >= 0; i--) {
    repaired += safeStack[i] === "{" ? "}" : "]";
  }
  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}
