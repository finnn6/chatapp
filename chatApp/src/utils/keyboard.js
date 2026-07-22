// onKeyDown 할 때 IME 버그 해결하기 위함
export const handleEnter = (callback) => (e) => {
  if (e.isComposing || e.keyCode === 229) return
  if (e.key === 'Enter') callback()
}