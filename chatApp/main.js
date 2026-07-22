const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const chatWindows = new Map();

// 메인 창
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 개발 모드: Vite 서버 로드
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    // 프로덕션: 빌드된 파일 로드
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

// 채팅방 창
function createChatWindow(roomId, title) {
  if (chatWindows.has(roomId)) {
    const existing = chatWindows.get(roomId)
    if (existing.isMinimized()) existing.restore()
    existing.focus()
    return existing
  }

  const win = new BrowserWindow({
    width: 600,
    height: 500,
    title,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL(`http://localhost:5173/chat/${roomId}`)
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'), {
      hash: `/chat/${roomId}`
    })
  }

  chatWindows.set(roomId, win);
  win.on('closed', () => chatWindows.delete(roomId));
  return win
}

// 채팅창 열기
ipcMain.on('open:chat', (event, { roomId, friend }) => {
  createChatWindow(roomId, friend.username);
})

// 알림
ipcMain.handle('notify:message', (event, { roomId, senderName, text }) => {
  const win = chatWindows.get(roomId);
  // 그 방 창이 열려있고 + focus됐고 + 최소화 아니면 → 보는 중
  const isWatching = win && !win.isDestroyed() && win.isFocused() && !win.isMinimized();

  if (isWatching) {
    return { wasWatching: true }   // 보고 있었음 → 알림 X, unread X
  }

  // 안 보고 있음 → 알림 띄우기
  const notification = new Notification({
    title: senderName,
    body: text,
  });

  notification.on('click', () => {
    createChatWindow(roomId, senderName);
  })
  notification.show();
  return { wasWatching: false } // 안 보고 있었음 → unread +1
})

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});