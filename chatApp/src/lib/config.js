// 백엔드 서버 주소.
// - 개발(npm run dev): 기본값 localhost:3001
// - 프로덕션 빌드: .env.production 의 VITE_API_URL (Render 주소)
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
