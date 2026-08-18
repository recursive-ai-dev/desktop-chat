const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  newChat: () => ipcRenderer.invoke('chat:new'),
  cancel: () => ipcRenderer.invoke('chat:cancel'),
  sendMessage: (text) => ipcRenderer.invoke('chat:send', text),
  respondConfirm: (requestId, approved) => ipcRenderer.send('chat:confirm-response', { requestId, approved }),
  hidePanel: () => ipcRenderer.send('panel:hide'),

  onEvent: (cb) => ipcRenderer.on('chat:event', (evt, payload) => cb(payload)),
  onDone: (cb) => ipcRenderer.on('chat:done', () => cb()),
  onConfirmRequest: (cb) => ipcRenderer.on('chat:confirm-request', (evt, payload) => cb(payload)),
  onCleared: (cb) => ipcRenderer.on('chat:cleared', () => cb()),
  onShown: (cb) => ipcRenderer.on('panel:shown', () => cb())
});
