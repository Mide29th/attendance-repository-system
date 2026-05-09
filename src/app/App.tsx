import { Routes, Route } from 'react-router';
import { AdminDashboard } from './components/AdminDashboard';
import { CheckIn } from './components/CheckIn';
import { ExhibitorDirectory } from './components/ExhibitorDirectory';
import { Home } from './components/Home';

export default function App() {
  return (
    <div className="relative">
      <Routes>
        {/* Public Landing / Session Selection */}
        <Route path="/" element={<Home />} />
        
        {/* Admin Flow */}
        <Route path="/admin" element={<AdminDashboard />} />
        
        {/* Attendee Flow */}
        <Route path="/checkin/:sessionId" element={<CheckIn />} />
        <Route path="/checkin" element={<CheckIn />} /> {/* Fallback or generic */}
        
        {/* Directory/Public Flow */}
        <Route path="/directory" element={<ExhibitorDirectory />} />
      </Routes>
    </div>
  );
}