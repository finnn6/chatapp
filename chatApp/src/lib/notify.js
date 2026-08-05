// 웹 전용 알림이었는데 동작 실패해서 일단 보류
export const requestNotifyPermission = async () => {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

export const notify = ({ title, body, roomId, onClick }) => {
  console.log(Notification.permission, document.hasFocus())  
  if (Notification.permission !== 'granted') return
  if (document.hasFocus()) return

  console.log('[notify] 생성 시도')
try {
  const n = new Notification(title, { body, renotify: true, icon: '/icon.png' })
  console.log('[notify] 생성됨', n)
  n.onclick = () => { window.focus(); onClick?.(); n.close() }
} catch (e) {
  console.error('[notify] 실패', e)
}
}
if (typeof window !== 'undefined') window.__notify = notify