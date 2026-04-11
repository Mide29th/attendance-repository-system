import { useState, useEffect } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { CheckIn } from './components/CheckIn';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'admin' | 'checkin'>('admin');

  useEffect(() => {
    // Check URL parameters for routing
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');

    if (page === 'checkin') {
      setCurrentPage('checkin');
    } else {
      setCurrentPage('admin');
    }
  }, []);

  if (currentPage === 'checkin') {
    return <CheckIn />;
  }

  return <AdminDashboard />;
}