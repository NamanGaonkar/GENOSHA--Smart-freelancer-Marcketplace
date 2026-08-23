import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import AIChatbot from './AIChatbot';

export default function Layout() {
  return (
    <div className="gen-page">
      <Navbar />
      <main style={{ maxWidth: 1200, margin: '0 auto', overflowX: 'hidden' }}>
        <Outlet />
      </main>
      <AIChatbot />
    </div>
  );
}
