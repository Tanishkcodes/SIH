// A fresh, executable screen catalog is built for every utterance. Labels are
// metadata, never identifiers: repeated buttons must remain distinct.
export function controlLabel(element) {
  return String(element.getAttribute('aria-label') || element.getAttribute('title') || element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
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
  return Array.from(scope.querySelectorAll('button, a[href], [role="button"], [role="tab"], [data-voice-option], [data-voice-action], input[type="submit"], input[type="button"]'))
    .filter(element => isAvailableControl(element) && !element.closest('.voicenav-container'))
    .map(element => {
      const label = controlLabel(element);
      const container = element.closest('[data-voice-context], article, li, section, [role="tabpanel"]');
      const context = container?.getAttribute('data-voice-context') || container?.querySelector('h1,h2,h3,h4')?.textContent || '';
      const optionIndex = element.getAttribute('data-voice-option-index');
      return { element, label, description: [label, optionIndex && `Answer option ${optionIndex}`, context && `Context: ${context.trim()}`, element.getAttribute('aria-selected') === 'true' && 'Currently selected'].filter(Boolean).join(' | ') };
    }).filter(control => control.label)
    .map((control, index) => ({ ...control, intent: `activate_${index}` }));
}

// Read screen meaning, not the entire DOM or private field values. This also
// gives previously unseen forms and screens useful context without phrase lists.
export function captureScreenContext(root = document) {
  const dialogs = Array.from(root.querySelectorAll('[role="dialog"], dialog[open]')).filter(isAvailableControl);
  const scope = dialogs.at(-1) || root;
  const visible = selector => Array.from(scope.querySelectorAll(selector)).filter(isAvailableControl);
  return {
    headings: visible('h1,h2,h3,[data-voice-prompt]').map(el => controlLabel(el)).filter(Boolean).slice(0, 12),
    selectedTabs: visible('[role="tab"][aria-selected="true"], [aria-current="page"]').map(controlLabel),
    fields: visible('input:not([type="hidden"]):not([type="password"]),textarea,select').map(el => ({
      name: el.name || el.id || '', type: el.type || el.tagName?.toLowerCase(),
      label: el.getAttribute('aria-label') || Array.from(el.labels || []).map(label => label.textContent).join(' ') || el.placeholder || el.name || '',
      focused: el === root.activeElement, filled: Boolean(el.value),
      options: el.tagName === 'SELECT' ? Array.from(el.options).filter(option => !option.disabled).map(option => option.text) : undefined,
    })).slice(0, 30),
    dialog: Boolean(dialogs.length),
  };
}

// Validate the chosen action only; an unrelated clock or newly inserted button
// must not invalidate the user's turn. Never bind an old index to a new element.
export function isCurrentAction(result, actions, currentActions, controls, currentControls) {
  if (/^activate_\d+$/.test(result.intent)) {
    const old = controls.find(control => control.intent === result.intent);
    return Boolean(old && currentControls.some(control => control.element === old.element && control.label === old.label && control.description === old.description));
  }
  const old = actions.find(action => action.intent === result.intent);
  const current = currentActions.find(action => action.intent === result.intent);
  return Boolean(old && current && old.description === current.description);
}

export function buildActions(pageCommands = {}, globalCommands = {}, controls = []) {
  const registered = { ...globalCommands, ...pageCommands };
  return [
    ...Object.entries(registered).map(([intent, description]) => ({ intent, description: Array.isArray(description) ? description.join(' | ') : String(description) })),
    ...controls.map(({ intent, description, label }) => ({ intent, description, label })),
  ];
}

export function validateIntent(result, actions, routes = [], expectsFreeText = false) {
  if (!result || !Number.isFinite(result.confidence) || result.confidence < 0.5) return false;
  if (result.intent === 'out_of_context') return true;
  if (result.intent === 'free_text') return expectsFreeText;
  if (!actions.some(action => action.intent === result.intent)) return false;
  if (['navigate', 'navigate_to'].includes(result.intent)) {
    return routes.some(route => route.id === (result.target || result.value));
  }
  return true;
}
