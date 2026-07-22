const { contextBridge, ipcRenderer } = require('electron');

// 필요한 API만 노출
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  // React → main.js로 보내는 것. 새 창 열기 위함
  openChat: (data) => ipcRenderer.send('open:chat', data),
  notifyMessage: (data) => ipcRenderer.invoke('notify:message', data),
});