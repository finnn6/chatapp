# 채팅 애플리케이션 구현하기

**접속 상태, 안읽음 개수, 타이핑까지 실시간으로 동기화되는 웹 메신저**

[데모 바로가기](https://chatapp-six-chi.vercel.app/)

개인 프로젝트 · 2026.06 ~ 2026.07 (2개월)

<br>

## 화면
<img width="612" height="486" alt="Aug-04-2026 16-30-32" src="https://github.com/user-attachments/assets/4421f2f2-0442-4d74-83ff-7a2a371ab6c7" />
<img width="640" height="570" alt="Aug-04-2026 16-30-40" src="https://github.com/user-attachments/assets/9c3e4e4e-7152-4c2e-b500-999f3110b737" />
<img width="640" height="570" alt="Aug-04-2026 16-31-08" src="https://github.com/user-attachments/assets/0e267bb8-87bf-46bb-85ff-715d66914fae" />
<img width="645" height="447" alt="image" src="https://github.com/user-attachments/assets/465104d6-c049-4df0-ae57-d49d2841a0ae" />

<br>

## 기술 스택

**Frontend** — React 19, Vite 6, React Router 7, Tailwind CSS 4, shadcn/ui(Radix), socket.io-client, ky

**Backend** — Node.js, Express 5, MongoDB(Mongoose 8), Socket.IO 4, Passport(Google OAuth 2.0), JWT

**배포** — Vercel(클라이언트), Render(서버), MongoDB Atlas

상태 관리 라이브러리를 쓰지 않고 Context API로 해결했다. 전역 상태가 `인증 / 소켓 연결 / 채팅방 목록` 세 가지로 명확히 나뉘고 서로 단방향으로만 의존해서, 별도 라이브러리를 도입할 만큼 복잡하지 않다고 판단했다.

<br>

## 주요 기능

- **Google OAuth 로그인** — Passport로 인증 후 JWT 발급(7일), REST와 소켓 핸드셰이크에서 동일한 토큰 검증
- **1:1 실시간 채팅** — 메시지 송수신, 타이핑 인디케이터, 안읽음 배지
- **접속 상태 공유** — online / away / busy / invisible, 친구 목록과 채팅방에 실시간 반영
- **친구 관리** — 이메일로 검색, 요청 · 수락 · 거절, 관계 상태(친구/대기중/없음) 판별
- **채팅방 나가기** — 나간 시점 이후의 대화만 다시 보이는 방식(아래 상세)

<br>

## 아키텍처

### Context 계층

```
AuthProvider      로그인 사용자 + JWT
      ↓
SocketProvider    소켓 연결 1개 + 전체 사용자 접속 상태
      ↓
ChatProvider      채팅방 목록 + 안읽음 개수
```

의존 방향이 아래로만 흐른다. `ChatProvider`는 `useSocket()`으로 연결을 빌려 쓴다. 소켓을 별도 계층으로 분리한 이유는 두 가지다. 
1. 소켓 연결은 하나만 존재해야 하므로 생성을 한곳에 격리했다.
2. 채팅방 목록은 메시지가 올 때마다 갱신되는데 이 리렌더가 소켓만 쓰는 컴포넌트로 번지지 않게 하려 했다.

### 소켓 룸 구조

채팅방이 몇 개든 **연결은 사용자당 하나**다. 서버는 두 종류의 룸으로 전송 대상을 나눈다.

| 룸 | 참여 시점 | 용도 |
|---|---|---|
| `user:{userId}` | 소켓 연결 직후 자동 | 방 목록 갱신, 읽음 동기화, 나가기 알림 |
| `{roomId}` | 채팅방 화면 진입 시 | 메시지, 타이핑 |

개인 룸을 따로 둔 덕분에, 채팅방 화면에 들어가 있지 않아도 목록의 안읽음 배지가 실시간으로 갱신된다.

<br>

## 기술적 문제와 해결

### 1. 나간 채팅방을 어떻게 다룰 것인가

**문제** — 방을 나가면 목록에서 사라져야 하지만, 상대가 다시 말을 걸면 다시 나타나야 한다. 방을 삭제하면 상대방의 대화 이력이 사라져야 한다. 한 사람의 "나감"이 다른 사람에게 영향을 주면 안 된다.

**해결** — 방을 지우는 대신 `leftParticipants`에 `{ user, leftAt }`을 기록하는 소프트 삭제 방식을 택했다. 이 시각 하나가 세 곳에서 기준점으로 쓰인다.

```js
// 목록 조회: 나간 뒤 새 메시지가 있으면 다시 노출
if (myLeft) {
  const hasNewMessage = await Message.exists({
    roomId: room._id,
    createdAt: { $gt: myLeft.leftAt }
  })
  if (!hasNewMessage) continue
}

// 안읽음 개수: leftAt과 lastReadAt 중 나중 것부터
const since = myLeft
  ? new Date(Math.max(myLeft.leftAt, me?.lastReadAt || 0))
  : (me?.lastReadAt || new Date(0))
```

메시지 히스토리 조회도 같은 기준을 적용해서, 다시 들어온 방에는 나가기 전 대화가 보이지 않는다. 양쪽 모두 나갔고 그 이후로 아무 메시지도 없을 때만 방과 메시지를 실제로 삭제한다.

**결과** — 하나의 방을 참여자마다 다른 시작점으로 바라보게 된다. 나갔던 방도 대화가 재개되면 목록으로 돌아온다.

### 2. "메시지를 읽었다"를 어떻게 판정할 것인가

**문제** — 채팅방을 열어두기만 하면 읽음으로 처리할 경우, 다른 앱을 쓰는 동안 백그라운드로 도착한 메시지까지 읽음이 된다.

**해결** — `document.hasFocus()`로 창이 실제 활성 상태일 때만 읽음 처리했다. 그런데 이 조건만으로는 포커스 없이 받은 메시지를 읽음으로 바꿀 수 없어서, 되돌아왔을 때 만회하는 경로를 함께 뒀다.

| 시점 | 처리 |
|---|---|
| 채팅방 진입 | `room:join` 직후 `room:read` |
| 포커스가 있는 상태에서 수신 | 메시지 핸들러에서 즉시 |
| 나중에 창으로 복귀 | `focus` · `visibilitychange` 이벤트 |


**결과** — 읽음 표시의 정확도를 유지하면서, 놓친 케이스가 사용자 조작만으로 자동 복구된다.

### 3. 새로고침할 때마다 접속 상태가 깜빡이는 문제

**문제** — 새로고침 시 소켓이 끊기고 새로 연결된다. 그래서 상대가 새로고침만 해도 친구 목록에서 오프라인 → 온라인이 1~2초간 깜빡인다.

**해결** — 접속 상태를 `userId → Set<socketId>` 구조로 관리해 사용자당 소켓ID를 여러개 담아둘 수 있게 하고, 마지막 소켓이 끊겨도 곧바로 오프라인 처리하지 않고 5초의 유예를 뒀다.

```js
if (socketIds.size === 0) {
  const timer = setTimeout(() => {
    onlineUsers.delete(userId)
    io.emit('user:status', { userId, status: 'offline' })
  }, 5000)
  offlineTimers.set(userId, timer)
}
```

유예 시간 안에 같은 사용자가 다시 연결되면 타이머를 취소한다. 새로고침은 사실상 "짧은 재연결"이므로 상대 화면에서는 아무 일도 일어나지 않는다.

**결과** — 새로고침과 무관하게 접속 상태가 안정적으로 유지된다.

### 4. 웹 - 뒤로가기로 돌아오면 이전 화면 그대로 표시되는 문제

**문제** — 웹 채팅창에서 뒤로가기로 목록에 돌아오면 메시지를 읽기 전 화면 표시되었다. 콘솔에는 이런 로그가 남았다.

```
WebSocket connection to 'ws://localhost:3001/socket.io/...' failed:
Page entered Back-Forward Cache.
```

**원인** — 브라우저는 뒤로가기를 즉시 처리하려고 페이지를 메모리에 얼려두는데(bfcache), 살아있는 WebSocket이 있으면 캐시에 넣을 수 없어 연결을 강제로 종료한다. 문제는 복원했을 때 **화면은 떠날 때 그대로**라는 점이다. 메시지를 읽었음에도 이전 화면이 그대로 보인 것.

**해결** — 복원을 명시적으로 감지해 상태를 다시 맞춘다.

```js
const handlePageShow = (e) => {
  if (e.persisted) {          // bfcache에서 복원된 경우만
    api.get('api/chatrooms').json().then(setRooms)
  }
}
window.addEventListener('pageshow', handlePageShow)
```

소켓은 `visibilitychange`와 `online` 시점에 연결 여부를 확인하고 끊겨 있으면 재연결한다.

**결과** — 뒤로가기·탭 전환·네트워크 복구 후에도 화면과 서버 상태가 어긋나지 않는다.

### 5. 상태 숨김을 클라이언트에 맡기지 않기

`invisible`을 선택한 사용자는 남들에게 오프라인으로 보여야 한다. 이 판정을 클라이언트에서 하면 응답에 원본 값이 실려 나가므로, 개발자 도구만 열어도 숨김 상태가 드러난다.

서버가 노출용 상태를 계산하고 원본 `customStatus`는 응답에서 제거하도록 했다.

```js
const { customStatus, ...userRest } = p.user || {}
return {
  ...p,
  user: { ...userRest, status: getVisibleStatus(String(p.user?._id), customStatus) }
}
```

<br>



## 폴더 구조

```
├── chatApp/                  클라이언트
│   ├── src/
│   │   ├── context/          AuthContext · SocketContext · ChatContext
│   │   ├── pages/            Home · ChatWindow · Login · AuthCallback
│   │   ├── components/       친구 목록 · 채팅방 목록 · 공통 UI
│   │   └── lib/              api(ky) · config
│   ├── main.js               Electron 메인 프로세스 (아래 참고)
│   └── preload.js
│
└── chatApp-server/           서버
    └── src/
        ├── server.js         Express + Socket.IO 이벤트 핸들러
        ├── models/           User · ChatRoom · Message
        ├── routes/           auth · users · friends · chatrooms · messages
        ├── middleware/       JWT 검증
        └── onlineUsers.js    접속 상태 관리
```

<br>

## 중단한 시도 — 데스크톱 앱

초기에는 Electron 데스크톱 클라이언트를 함께 개발했다. 채팅방마다 별도 `BrowserWindow`를 띄우고, 해당 창이 포커스 상태인지 확인해 보고 있지 않을 때만 네이티브 알림을 보내는 구조였다.

{중단 이유 — 예: 코드 서명·배포 비용 대비 이득이 적다고 판단, 웹 우선으로 범위를 좁힘}

`main.js`, `preload.js`와 클라이언트의 `window.electron` 분기가 그 흔적이다. 데스크톱 환경에서만 창 제어와 네이티브 알림을 사용하고 웹에서는 자동으로 우회하도록 작성되어 있어, 현재 웹 빌드에는 영향을 주지 않는다.
