/**
 * A modified or non-primary click on a link is handled by the browser itself
 * (new tab, new window, download), so side effects like closing a dialog or
 * collapsing the mobile sidebar must be skipped for those.
 */
export function isPlainPrimaryClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}
