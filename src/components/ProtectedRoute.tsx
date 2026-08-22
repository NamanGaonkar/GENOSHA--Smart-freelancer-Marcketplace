import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate('/login');
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#27f3a9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return <Outlet />;
}
