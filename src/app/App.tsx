import { Routes, Route, Navigate } from 'react-router';
import { AdminDashboard } from './components/AdminDashboard';
import { CheckIn } from './components/CheckIn';
import { ExhibitorDirectory } from './components/ExhibitorDirectory';

export default function App() {
  return (
    <div className="relative">
      <Routes>
        {/* Admin Flow */}
        <Route path="/admin" element={<AdminDashboard />} />
        
        {/* Attendee Flow */}
        <Route path="/checkin/:sessionId" element={<CheckIn />} />
        <Route path="/checkin" element={<CheckIn />} /> {/* Fallback or generic */}
        
        {/* Directory/Public Flow */}
        <Route path="/directory" element={<ExhibitorDirectory />} />
        
        {/* Default Route */}
        <Route path="/" element={<Navigate to="/checkin" replace />} />
      </Routes>
    </div>
  );
}