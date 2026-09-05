// A fresh, executable screen catalog is built for every utterance. Labels are
// metadata, never identifiers: repeated buttons must remain distinct.
export function controlLabel(element) {
  return String(element.getAttribute('aria-label') || element.getAttribute('title') || element.innerText || element.value || '').replace(/\s+/g, ' ').trim();
}

export function isAvailableControl(element) {
  const style = element?.ownerDocument?.defaultView?.getComputedStyle(element);
  if (style?.visibility === 'hidden' || style?.visibility === 'collapse') return false;
  return Boolean(element?.isConnected && !element.disabled &&
    !element.closest('[hidden], [inert], [aria-hidden="true"], [aria-disabled="true"]') &&
    element.getClientRects().length);
}

export function captureControls(root = document) {
  const dialogs = Array.from(root.querySelectorAll('[role="dialog"], dialog[open]')).filter(isAvailableControl);
  const scope = dialogs.at(-1) || root;
  return Array.from(scope.querySelectorAll('button, a[href], [role="button"], [role="tab"], input[type="submit"], input[type="button"]'))
    .filter(element => isAvailableControl(element) && !element.closest('.voicenav-container'))
    .map(element => {
      const label = controlLabel(element);
      const container = element.closest('[data-voice-context], article, li, section, [role="tabpanel"]');
      const context = container?.getAttribute('data-voice-context') || container?.querySelector('h1,h2,h3,h4')?.textContent || '';
      const optionIndex = element.getAttribute('data-voice-option-index');
      return { element, label, description: [label, optionIndex && `Answer option ${optionIndex}`, context && `Context: ${context.trim()}`].filter(Boolean).join(' | ') };
    }).filter(control => control.label)
    .map((control, index) => ({ ...control, intent: `activate_${index}` }));
}

export function buildActions(pageCommands = {}, globalCommands = {}, controls = []) {
  const registered = { ...globalCommands, ...pageCommands };
  return [
    ...Object.entries(registered).map(([intent, description]) => ({ intent, description: Array.isArray(description) ? description.join(' | ') : String(description) })),
    ...controls.map(({ intent, description, label }) => ({ intent, description, label })),
  ];
}

export function validateIntent(result, actions, routes = [], expectsFreeText = false) {
  if (!result || !Number.isFinite(result.confidence) || result.confidence < 0.7) return false;
  if (result.intent === 'out_of_context') return true;
  if (result.intent === 'free_text') return expectsFreeText;
  if (!actions.some(action => action.intent === result.intent)) return false;
  if (['navigate', 'navigate_to'].includes(result.intent)) {
    return routes.some(route => route.id === (result.target || result.value));
  }
  return true;
}
