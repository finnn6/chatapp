const { app, BrowserWindow, ipcMain, Notification, shell } = require('electron');
const path = require('path');
const http = require('http');
const chatWindows = new Map();

// 패키징된 앱이면 프로덕션, 아니면 개발
const isDev = !app.isPackaged;
// 데스크톱 OAuth 토큰을 돌려받을 로컬 루프백 포트
const LOOPBACK_PORT = 5899;

let mainWindow = null;

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
  mainWindow = win;

  // 개발 모드: Vite 서버 로드
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    // 프로덕션: 빌드된 파일 로드
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

// 구글 로그인: 시스템 브라우저로 인증을 열고,
// 서버가 http://127.0.0.1:<포트>로 토큰을 리다이렉트하면 그걸 받아 반환한다.
function startGoogleLogin(apiUrl) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url, `http://127.0.0.1:${LOOPBACK_PORT}`);
      const token = reqUrl.searchParams.get('token');

      res.writeHead(token ? 200 : 400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        `<html><body style="font-family:sans-serif;text-align:center;padding-top:60px">
           <h2>${token ? '로그인 완료! 이 창을 닫고 앱으로 돌아가세요.' : '토큰을 받지 못했습니다.'}</h2>
         </body></html>`
      );
      server.close();

      if (token) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }
        resolve(token);
      } else {
        reject(new Error('토큰 없음'));
      }
    });

    server.on('error', reject);
    server.listen(LOOPBACK_PORT, '127.0.0.1', () => {
      // 사용자의 기본 브라우저로 구글 인증 시작 (구글은 앱 내장창 OAuth를 막으므로 외부 브라우저 사용)
      shell.openExternal(`${apiUrl}/auth/google`);
    });
  });
}

ipcMain.handle('auth:login', (event, apiUrl) => startGoogleLogin(apiUrl));

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

  if (isDev) {
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