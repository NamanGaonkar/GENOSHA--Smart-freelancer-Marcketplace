import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import AIChatbot from './AIChatbot';

export default function Layout() {
  return (
    <div className="gen-page">
      <Navbar />
      <main style={{ paddingTop: 80, maxWidth: 1200, margin: '0 auto', padding: '80px 24px 40px' }}>
        <Outlet />
      </main>
      <AIChatbot />
    </div>
  );
}
