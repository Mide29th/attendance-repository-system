import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { utils, writeFile } from 'xlsx';
import { attendanceService } from '../services/attendanceService';
import { AttendeeRecord } from '../types';
import {
  Download,
  Users,
  Circle,
  Clock,
  RefreshCw,
  QrCode
} from 'lucide-react';

export function AdminDashboard() {
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Get check-in URL
  const checkInUrl = `${window.location.origin}?page=checkin&session=${attendanceService.getCurrentSession().sessionId}`;

  // Load initial data and subscribe to changes
  useEffect(() => {
    const loadData = () => {
      setAttendees(attendanceService.getAttendees());
      setLastUpdate(new Date());
    };

    loadData();

    // Subscribe to attendance service changes
    const unsubscribe = attendanceService.subscribe(loadData);

    // Listen for storage events (for multi-tab sync)
    const handleStorageChange = () => loadData();
    window.addEventListener('storage', handleStorageChange);

    // Online/offline detection
    const handleOnline = () => {
      setIsOnline(true);
      attendanceService.syncOfflineData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Export to Excel
  const handleExport = () => {
    const data = attendanceService.getExportData();
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Attendance');

    const timestamp = new Date().toISOString().split('T')[0];
    writeFile(wb, `Swift_Attend_${timestamp}.xlsx`);
  };

  // New session
  const handleNewSession = () => {
    if (confirm('Start a new session? This will clear current attendance data.')) {
      attendanceService.clearSession();
      setAttendees([]);
      setShowQR(false);
    }
  };

  const totalAttendees = attendees.length;
  const lastCheckIn = attendees.length > 0
    ? attendees[attendees.length - 1]
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl">Swift Attend</h1>
            <p className="text-muted-foreground">Admin Panel</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleNewSession}
              className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              New Session
            </button>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              isOnline ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
            }`}>
              <Circle className={`w-2 h-2 fill-current ${isOnline ? 'animate-pulse' : ''}`} />
              <span className="text-sm">{isOnline ? 'Live' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted-foreground">Total Attendees</p>
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-4xl">{totalAttendees}</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted-foreground">Status</p>
              <Circle className="w-5 h-5 text-green-500 fill-current" />
            </div>
            <p className="text-2xl">Active</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted-foreground">Last Check-In</p>
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm">
              {lastCheckIn
                ? new Date(lastCheckIn.timestamp).toLocaleTimeString()
                : 'No check-ins yet'}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QR Code Panel */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl mb-4">QR Code</h2>

              {!showQR ? (
                <button
                  onClick={() => setShowQR(true)}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <QrCode className="w-5 h-5" />
                  Generate QR Code
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg flex justify-center">
                    <QRCodeSVG
                      value={checkInUrl}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Scan to check in
                    </p>
                    <button
                      onClick={() => setShowQR(false)}
                      className="text-sm text-primary hover:underline"
                    >
                      Hide QR Code
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attendance Table */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-xl">Live Attendance</h2>
                  <p className="text-sm text-muted-foreground">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={handleExport}
                  disabled={attendees.length === 0}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export to Excel
                </button>
              </div>

              <div className="overflow-x-auto" style={{ maxHeight: '500px' }}>
                {attendees.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No attendees yet</p>
                    <p className="text-sm">Attendees will appear here after check-in</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left">S/N</th>
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left">ID Type</th>
                        <th className="px-4 py-3 text-left">ID Number</th>
                        <th className="px-4 py-3 text-left">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendees.map((attendee, index) => (
                        <tr
                          key={attendee.id}
                          className="border-b border-border hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-3">{index + 1}</td>
                          <td className="px-4 py-3">{attendee.name}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded text-xs ${
                              attendee.idType === 'student'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {attendee.idType === 'student' ? 'Student' : 'Lecturer'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">
                            {attendee.idNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {new Date(attendee.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
