import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import GroupDetails from './pages/GroupDetails';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { GroupProvider } from './contexts/GroupContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { api } from './services/api';
import { RefreshCcw } from 'lucide-react';
import './App.css';

// Componente para proteger rotas privadas
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

function App() {
  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await api.getInitialData();
        setData(result);
      } catch (error) {
        console.error("Failed to load initial data", error);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, []);

  if (loadingData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCcw className="animate-spin text-indigo-600" size={32} />
          <p className="text-slate-500 font-medium">Carregando Sistema Multi-Empresas...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AuthProvider>
        <GroupProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
              <PrivateRoute>
                <DashboardLayout
                  currentUser={data?.currentUser}
                  companyName={data?.company?.name}
                  unreadCount={data?.chats?.filter(c => c.unread > 0).length || 0}
                  data={data}
                  setData={setData}
                />
              </PrivateRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="groups" element={<Groups />} />
              <Route path="groups/:id" element={<GroupDetails />} />
              <Route path="chat" element={<Chat />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </GroupProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
