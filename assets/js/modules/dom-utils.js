export function cloneTemplate(template) {
  if (!template || !(template instanceof HTMLTemplateElement)) {
    throw new Error("cloneTemplate: invalid template provided");
  }
  return template.content.firstElementChild.cloneNode(true);
}

export function clearChildren(element) {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function formatSeatLabel(seats) {
  const value = Number.parseInt(seats, 10);
  if (Number.isNaN(value)) return "Unknown seating";
  return `${value} ${value === 1 ? "seater" : "seaters"}`;
}

export function focusFirstInput(container) {
  if (!container) return;
  const input = container.querySelector(
    "input:not([type=hidden]):not([disabled])"
  );
  if (input) {
    requestAnimationFrame(() => input.focus());
  }
}

