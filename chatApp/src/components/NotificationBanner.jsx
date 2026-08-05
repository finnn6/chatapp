import { useState } from 'react'

export default function NotificationBanner() {
    const supported = 'Notification' in window
    const [permission, setPermission] = useState(
        supported ? Notification.permission : 'unsupported'
    )
    const [dismissed, setDismissed] = useState(
        () => localStorage.getItem('notifyBannerDismissed') === '1'
    )

    // 물어볼 수 있는 상태일 때만 노출
    if (!supported || permission !== 'default' || dismissed) return null

    const enable = async () => {
        const result = await Notification.requestPermission()
        setPermission(result)
        if (result === 'granted') {
            new Notification('알림이 켜졌어요')   // 바로 확인시켜주기
        }
    }

    const close = () => {
        localStorage.setItem('notifyBannerDismissed', '1')
        setDismissed(true)
    }

    return (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-muted text-xs">
            <span className="flex-1">알림을 켜면 새 메시지를 놓치지 않아요</span>
            <button onClick={enable} className="px-2 py-1 bg-pixel-pink text-primary-foreground border border-black/40">
                켜기
            </button>
            <button onClick={close} className="px-1 text-muted-foreground">✕</button>
        </div>
    )
}