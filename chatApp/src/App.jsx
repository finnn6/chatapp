import { Routes, Route } from 'react-router-dom';
import AuthCallback from './pages/AuthCallback';
import Home from './pages/Home';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ChatWindow from './pages/ChatWindow';
import { ChatProvider } from './context/ChatContext';

function App() {

  return (
    <AuthProvider>
      <SocketProvider>
        <ChatProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/google" element={<AuthCallback />} />
            <Route path="/" element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            } />
            <Route path="/chat/:roomId" element={
              <PrivateRoute>
                <ChatWindow />
              </PrivateRoute>
            } />
          </Routes>
        </ChatProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;