const PREFIX = "cat";

export function createId(prefix = PREFIX) {
  const random = Math.random().toString(36).slice(2, 8);
  const now = Date.now().toString(36);
  return `${prefix}-${now}-${random}`;
}

