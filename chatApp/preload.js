const { contextBridge, ipcRenderer } = require('electron');

// 필요한 API만 노출
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  // React → main.js로 보내는 것. 새 창 열기 위함
  openChat: (data) => ipcRenderer.send('open:chat', data),
  notifyMessage: (data) => ipcRenderer.invoke('notify:message', data),
  // 구글 로그인: 시스템 브라우저로 인증 후 토큰을 돌려받음
  login: (apiUrl) => ipcRenderer.invoke('auth:login', apiUrl),
});