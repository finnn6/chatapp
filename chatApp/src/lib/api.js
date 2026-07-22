import ky from 'ky'

const api = ky.create({
  prefixUrl: 'http://localhost:3001',
  hooks: {
    beforeRequest: [
      request => {
        const token = localStorage.getItem('token')
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`)
        }
      }
    ]
  }
})

export default api