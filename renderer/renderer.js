const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('btn-send');
const stopBtn = document.getElementById('btn-stop');
const newBtn = document.getElementById('btn-new');
const hideBtn = document.getElementById('btn-hide');
const settingsBtn = document.getElementById('btn-settings');

const settingsOverlay = document.getElementById('settings-overlay');
const confirmOverlay = document.getElementById('confirm-overlay');

let currentAssistantEl = null;
let sending = false;

// Streaming deltas are buffered and flushed at most once per animation frame instead of
// mutating the DOM on every token — avoids O(n^2) textContent churn and per-token layout
// thrashing from scrollToBottom() on long responses.
let pendingText = '';
let rafScheduled = false;

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function flushPendingText() {
  rafScheduled = false;
  if (!currentAssistantEl || !pendingText) return;
  currentAssistantEl._textNode.appendData(pendingText);
  pendingText = '';
  scrollToBottom();
}

function appendBubble(role, text) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  const textNode = document.createTextNode(text);
  el.appendChild(textNode);
  el._textNode = textNode;
  messagesEl.appendChild(el);
  scrollToBottom();
  return el;
}

function appendToolBubble(html) {
  const el = document.createElement('div');
  el.className = 'msg tool';
  el.innerHTML = html;
  messagesEl.appendChild(el);
  scrollToBottom();
  return el;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
    }
  });
}

function setSending(v) {
  sending = v;
  sendBtn.classList.toggle('hidden', v);
  stopBtn.classList.toggle('hidden', !v);
}

async function send() {
  const text = inputEl.value.trim();
  if (!text || sending) return;
  inputEl.value = '';
  appendBubble('user', text);
  currentAssistantEl = null;
  setSending(true);
  await window.api.sendMessage(text);
}

sendBtn.addEventListener('click', send);
stopBtn.addEventListener('click', () => window.api.cancel());
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!settingsOverlay.classList.contains('hidden')) {
      settingsOverlay.classList.add('hidden');
    } else if (!confirmOverlay.classList.contains('hidden')) {
      // require explicit choice
    } else {
      window.api.hidePanel();
    }
  }
});

newBtn.addEventListener('click', async () => {
  await window.api.newChat();
  messagesEl.innerHTML = '';
  currentAssistantEl = null;
});

hideBtn.addEventListener('click', () => window.api.hidePanel());

window.api.onCleared(() => {
  messagesEl.innerHTML = '';
  currentAssistantEl = null;
});

window.api.onShown(() => {
  inputEl.focus();
});

window.api.onEvent((event) => {
  if (event.type === 'text-delta') {
    if (!currentAssistantEl) currentAssistantEl = appendBubble('assistant', '');
    pendingText += event.text;
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(flushPendingText);
    }
  } else if (event.type === 'tool-call') {
    flushPendingText();
    currentAssistantEl = null;
    appendToolBubble(
      `<span class="tool-name">▶ ${escapeHtml(event.name)}</span>\n${escapeHtml(JSON.stringify(event.args, null, 2))}`
    );
  } else if (event.type === 'tool-result') {
    appendToolBubble(
      `<span class="tool-name">✓ ${escapeHtml(event.name)}</span>\n${escapeHtml(event.result)}`
    );
  } else if (event.type === 'tool-error') {
    appendToolBubble(
      `<span class="tool-name tool-error">✗ ${escapeHtml(event.name)}</span>\n<span class="tool-error">${escapeHtml(event.error)}</span>`
    );
  } else if (event.type === 'tool-declined') {
    appendToolBubble(`<span class="tool-name tool-error">✗ ${escapeHtml(event.name)} declined</span>`);
  } else if (event.type === 'notice') {
    flushPendingText();
    currentAssistantEl = null;
    appendBubble('notice', event.text);
  } else if (event.type === 'error') {
    flushPendingText();
    appendBubble('error', event.message);
    currentAssistantEl = null;
  }
});

window.api.onDone(() => {
  flushPendingText();
  setSending(false);
});

// ---- confirmation dialog ----

let activeConfirm = null;
const confirmTitle = document.getElementById('confirm-title');
const confirmBody = document.getElementById('confirm-body');

window.api.onConfirmRequest(({ requestId, name, args, preview }) => {
  activeConfirm = requestId;
  confirmTitle.textContent = `Allow ${name}?`;
  confirmBody.textContent = preview || JSON.stringify(args, null, 2);
  confirmOverlay.classList.remove('hidden');
});

document.getElementById('confirm-allow').addEventListener('click', () => {
  if (activeConfirm) window.api.respondConfirm(activeConfirm, true);
  activeConfirm = null;
  confirmOverlay.classList.add('hidden');
});

document.getElementById('confirm-deny').addEventListener('click', () => {
  if (activeConfirm) window.api.respondConfirm(activeConfirm, false);
  activeConfirm = null;
  confirmOverlay.classList.add('hidden');
});

// ---- settings ----

const sEndpoint = document.getElementById('s-endpoint');
const sModel = document.getElementById('s-model');
const sApiKey = document.getElementById('s-apikey');
const sConfirm = document.getElementById('s-confirm');
const sHotkey = document.getElementById('s-hotkey');
const sKeyStorage = document.getElementById('s-keystorage');

async function openSettings() {
  const s = await window.api.getSettings();
  sEndpoint.value = s.endpoint || '';
  sModel.value = s.model || '';
  sApiKey.value = s.apiKey || '';
  sConfirm.checked = !!s.confirmDestructive;
  sHotkey.value = s.hotkey || '';
  sKeyStorage.textContent =
    s.keyStorage === 'encrypted'
      ? 'API key is encrypted at rest via the OS keyring.'
      : 'No OS keyring available — API key is stored in plaintext in config.json.';
  settingsOverlay.classList.remove('hidden');
}

settingsBtn.addEventListener('click', openSettings);
document.getElementById('s-cancel').addEventListener('click', () => settingsOverlay.classList.add('hidden'));

document.getElementById('s-save').addEventListener('click', async () => {
  await window.api.saveSettings({
    endpoint: sEndpoint.value.trim(),
    model: sModel.value.trim(),
    apiKey: sApiKey.value,
    confirmDestructive: sConfirm.checked,
    hotkey: sHotkey.value.trim() || 'CommandOrControl+Shift+T'
  });
  settingsOverlay.classList.add('hidden');
});

// first run: if no endpoint/model configured, nudge into settings
window.api.getSettings().then((s) => {
  if (!s.apiKey) {
    appendBubble('assistant', 'Hi — set your API endpoint, model, and key in Settings (⚙) to get started.');
  }
});

inputEl.focus();
