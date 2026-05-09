import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { utils, writeFile } from 'xlsx';
import { attendanceService } from '../services/attendanceService';
import { AttendeeRecord, SessionData, SessionType, UserRole } from '../types';

import {
  Download,
  Users,
  Circle,
  Clock,
  QrCode,
  Plus,
  Trash2,
  ChevronRight,
  LayoutDashboard,
  Settings,
  Lock,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';

export function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionType, setNewSessionType] = useState<SessionType>('check-in');
  
  // Edit State
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [editSessionName, setEditSessionName] = useState('');
  const [editSessionType, setEditSessionType] = useState<SessionType>('check-in');

  // Form Config State (shared between New and Edit)
  const [allowedRoles, setAllowedRoles] = useState<UserRole[]>(['student', 'lecturer', 'exhibitor', 'attendee']);
  const [requireIdNumber, setRequireIdNumber] = useState(true);
  const [collectBoothInfo, setCollectBoothInfo] = useState(true);

  
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadData = () => {
    const allSessions = attendanceService.getSessions();
    setSessions(allSessions);
    if (selectedSession) {
      const updated = allSessions.find(s => s.id === selectedSession.id);
      if (updated) setSelectedSession(updated);
    }
    setLastUpdate(new Date());
  };

  // Load data
  useEffect(() => {
    loadData();
    const unsubscribe = attendanceService.subscribe(loadData);

    const handleOnline = () => {
      setIsOnline(true);
      attendanceService.syncOfflineData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [selectedSession]);


  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Test123') { // Simple password as requested
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim() || allowedRoles.length === 0) {
      if (allowedRoles.length === 0) alert('Please select at least one allowed role.');
      return;
    }
    
    const newSession = attendanceService.createSession(newSessionName.trim(), newSessionType, {
      allowedRoles,
      requireIdNumber,
      collectBoothInfo
    });
    setSelectedSession(newSession);
    setIsCreating(false);
    setNewSessionName('');
    setAllowedRoles(['student', 'lecturer', 'exhibitor', 'attendee']);
    setRequireIdNumber(true);
    setCollectBoothInfo(true);
  };


  const handleUpdateSessionConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !editSessionName.trim() || allowedRoles.length === 0) {
      if (allowedRoles.length === 0) alert('Please select at least one allowed role.');
      return;
    }

    const updated = attendanceService.updateSession(selectedSession.id, {
      name: editSessionName.trim(),
      type: editSessionType,
      formConfig: {
        allowedRoles,
        requireIdNumber,
        collectBoothInfo
      }
    });

    if (updated) {
      setSelectedSession(updated);
      setIsEditingConfig(false);
      loadData();
    }
  };

  const startEditing = () => {
    if (!selectedSession) return;
    setEditSessionName(selectedSession.name);
    setEditSessionType(selectedSession.type);
    setAllowedRoles(selectedSession.formConfig.allowedRoles);
    setRequireIdNumber(selectedSession.formConfig.requireIdNumber);
    setCollectBoothInfo(selectedSession.formConfig.collectBoothInfo);
    setIsEditingConfig(true);
  };

  const handleDeleteSession = (id: string) => {

    if (confirm('Are you sure you want to delete this session? All attendee data for this session will be lost.')) {
      attendanceService.deleteSession(id);
      if (selectedSession?.id === id) setSelectedSession(null);
    }
  };

  const handleExport = (session: SessionData) => {
    const data = attendanceService.getExportData(session.id);
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Attendance');
    const timestamp = new Date().toISOString().split('T')[0];
    writeFile(wb, `${session.name.replace(/\s+/g, '_')}_${timestamp}.xlsx`);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Admin Portal</h1>
            <p className="text-muted-foreground">Authorized Access Only</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 bg-muted rounded-lg border border-border focus:ring-2 focus:ring-primary outline-none"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold hover:opacity-90 transition-opacity"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Swift Attend</h1>
              <span className="text-xs text-muted-foreground uppercase tracking-widest">Management Console</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              isOnline ? 'bg-green-100/10 text-green-500 border border-green-500/20' : 'bg-orange-100/10 text-orange-500 border border-orange-500/20'
            }`}>
              <Circle className={`w-2 h-2 fill-current ${isOnline ? 'animate-pulse' : ''}`} />
              {isOnline ? 'Live Network' : 'Offline Mode'}
            </div>
            <button onClick={() => setIsAuthenticated(false)} className="text-xs text-muted-foreground hover:text-foreground">Logout</button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {!selectedSession ? (
          /* Session List View */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Active Sessions</h2>
                <p className="text-muted-foreground">Manage your concurrent events and tracking sessions</p>
              </div>
              <button
                onClick={() => {
                  setAllowedRoles(['student', 'lecturer', 'exhibitor', 'attendee']);
                  setRequireIdNumber(true);
                  setCollectBoothInfo(true);
                  setIsCreating(true);
                }}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:opacity-90 transition-all shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Create New Form
              </button>

            </div>

            {isCreating && (
              <div className="bg-card border-2 border-primary/20 rounded-xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                <form onSubmit={handleCreateSession} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold mb-2">Session Name</label>
                      <input
                        type="text"
                        value={newSessionName}
                        onChange={(e) => setNewSessionName(e.target.value)}
                        placeholder="e.g. Morning Registration"
                        className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:ring-2 focus:ring-primary outline-none font-medium"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Session Type</label>
                      <select
                        value={newSessionType}
                        onChange={(e) => setNewSessionType(e.target.value as SessionType)}
                        className="w-full px-4 py-2.5 bg-muted rounded-lg border border-border focus:ring-2 focus:ring-primary outline-none appearance-none font-medium"
                      >
                        <option value="registration">Registration</option>
                        <option value="check-in">Check-in</option>
                        <option value="exhibition">Exhibition</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-border pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <Settings className="w-4 h-4 text-primary" />
                        Form Configuration
                      </h4>
                      <button 
                        type="button" 
                        onClick={() => setAllowedRoles([])}
                        className="text-[10px] text-primary hover:underline font-bold uppercase"
                      >
                        Start from Scratch
                      </button>
                    </div>

                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs text-muted-foreground uppercase tracking-wider font-bold mb-3">Allowed Roles</label>
                        <div className="flex flex-wrap gap-2">
                          {(['student', 'lecturer', 'exhibitor', 'attendee'] as const).map(role => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => {
                                setAllowedRoles(prev => 
                                  prev.includes(role) 
                                    ? prev.filter(r => r !== role) 
                                    : [...prev, role]
                                );
                              }}
                              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border-2 ${
                                allowedRoles.includes(role)
                                  ? 'bg-primary/10 border-primary text-primary'
                                  : 'bg-muted border-transparent text-muted-foreground hover:border-border'
                              }`}
                            >
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-6">
                         <label className="flex items-center gap-3 cursor-pointer group">
                           <div className="relative">
                             <input 
                               type="checkbox" 
                               checked={requireIdNumber} 
                               onChange={e => setRequireIdNumber(e.target.checked)} 
                               className="sr-only"
                             />
                             <div className={`w-10 h-5 rounded-full transition-colors ${requireIdNumber ? 'bg-primary' : 'bg-muted'}`}></div>
                             <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${requireIdNumber ? 'translate-x-5' : ''}`}></div>
                           </div>
                           <span className="text-sm font-medium group-hover:text-primary transition-colors">Require ID Number</span>
                         </label>

                         <label className="flex items-center gap-3 cursor-pointer group">
                           <div className="relative">
                             <input 
                               type="checkbox" 
                               checked={collectBoothInfo} 
                               onChange={e => setCollectBoothInfo(e.target.checked)} 
                               className="sr-only"
                             />
                             <div className={`w-10 h-5 rounded-full transition-colors ${collectBoothInfo ? 'bg-primary' : 'bg-muted'}`}></div>
                             <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${collectBoothInfo ? 'translate-x-5' : ''}`}></div>
                           </div>
                           <span className="text-sm font-medium group-hover:text-primary transition-colors">Collect Booth Info (Exhibitors)</span>
                         </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-2.5 bg-muted text-muted-foreground rounded-lg font-bold hover:bg-muted/80 transition-colors">Cancel</button>
                    <button type="submit" className="px-8 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all">Create Session & Form</button>
                  </div>
                </form>
              </div>
            )}


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-card border border-dashed border-border rounded-xl">
                  <p className="text-muted-foreground">No sessions created yet. Create your first session to start tracking!</p>
                </div>
              ) : (
                sessions.map(session => (
                  <div key={session.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors group relative shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-2 inline-block">
                          {session.type}
                        </span>
                        <h3 className="font-bold text-lg leading-snug">{session.name}</h3>
                        <p className="text-xs text-muted-foreground">{new Date(session.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleDeleteSession(session.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Attendees</p>
                        <p className="text-xl font-bold">{session.attendees.length}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Status</p>
                        <p className="text-xl font-bold text-green-500">Active</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => setSelectedSession(session)}
                      className="w-full bg-muted hover:bg-primary hover:text-primary-foreground text-foreground py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                    >
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Session Detail View */
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <button 
                onClick={() => setSelectedSession(null)}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                style={{ width: 'fit-content' }}
              >
                <ChevronLeft className="w-4 h-4" />
                Back to all sessions
              </button>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleExport(selectedSession)}
                  className="bg-card border border-border px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-muted transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export Data
                </button>
                <a 
                  href={`${window.location.origin}/checkin/${selectedSession.id}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Form
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Column: Info & QR */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="font-bold text-xl mb-4">Session Info</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Name</p>
                      <p className="font-medium">{selectedSession.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Type</p>
                      <div className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase uppercase tracking-wider">
                        {selectedSession.type}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Created</p>
                      <p className="text-sm">{new Date(selectedSession.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Settings className="w-5 h-5 text-primary" />
                      Form Config
                    </h3>
                    {!isEditingConfig && (
                      <button 
                        onClick={startEditing}
                        className="text-xs text-primary font-bold hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {isEditingConfig ? (
                    <form onSubmit={handleUpdateSessionConfig} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold mb-1 uppercase text-muted-foreground">Session Name</label>
                        <input
                          type="text"
                          value={editSessionName}
                          onChange={(e) => setEditSessionName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-muted rounded border border-border text-sm outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold mb-1 uppercase text-muted-foreground">Type</label>
                        <select
                          value={editSessionType}
                          onChange={(e) => setEditSessionType(e.target.value as SessionType)}
                          className="w-full px-3 py-1.5 bg-muted rounded border border-border text-sm outline-none focus:ring-1 focus:ring-primary appearance-none"
                        >
                          <option value="registration">Registration</option>
                          <option value="check-in">Check-in</option>
                          <option value="exhibition">Exhibition</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-[10px] font-bold uppercase text-muted-foreground">Allowed Roles</label>
                          <button 
                            type="button" 
                            onClick={() => setAllowedRoles([])}
                            className="text-[9px] text-primary hover:underline font-bold"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(['student', 'lecturer', 'exhibitor', 'attendee'] as const).map(role => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => {
                                setAllowedRoles(prev => 
                                  prev.includes(role) 
                                    ? prev.filter(r => r !== role) 
                                    : [...prev, role]
                                );
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-bold transition-all border ${
                                allowedRoles.includes(role)
                                  ? 'bg-primary/10 border-primary text-primary'
                                  : 'bg-muted border-transparent text-muted-foreground'
                              }`}
                            >
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                         <label className="flex items-center gap-2 cursor-pointer group">
                           <input 
                             type="checkbox" 
                             checked={requireIdNumber} 
                             onChange={e => setRequireIdNumber(e.target.checked)} 
                             className="w-3 h-3 rounded text-primary"
                           />
                           <span className="text-[11px] font-medium">Require ID</span>
                         </label>

                         <label className="flex items-center gap-2 cursor-pointer group">
                           <input 
                             type="checkbox" 
                             checked={collectBoothInfo} 
                             onChange={e => setCollectBoothInfo(e.target.checked)} 
                             className="w-3 h-3 rounded text-primary"
                           />
                           <span className="text-[11px] font-medium">Collect Booth Info</span>
                         </label>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button type="submit" className="flex-1 bg-primary text-primary-foreground py-1.5 rounded text-xs font-bold">Save</button>
                        <button type="button" onClick={() => setIsEditingConfig(false)} className="flex-1 bg-muted text-muted-foreground py-1.5 rounded text-xs font-bold">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1.5">Roles Enabled</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedSession.formConfig.allowedRoles.map(r => (
                            <span key={r} className="px-2 py-0.5 bg-muted rounded text-[10px] font-medium">{r}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Require ID:</span>
                        <span className={`font-bold ${selectedSession.formConfig.requireIdNumber ? 'text-primary' : 'text-muted-foreground'}`}>
                          {selectedSession.formConfig.requireIdNumber ? 'YES' : 'NO'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Booth Info:</span>
                        <span className={`font-bold ${selectedSession.formConfig.collectBoothInfo ? 'text-primary' : 'text-muted-foreground'}`}>
                          {selectedSession.formConfig.collectBoothInfo ? 'YES' : 'NO'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>


                <div className="bg-card border border-border rounded-xl p-6 text-center">

                  <h3 className="font-bold text-lg mb-4 flex items-center justify-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    Check-in QR
                  </h3>
                  <div className="bg-white p-4 rounded-xl inline-block shadow-sm mb-2">
                    <QRCodeSVG 
                      value={`${window.location.origin}/checkin/${selectedSession.id}`}
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="mb-4">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Session ID / Slug</p>
                    <code className="bg-muted px-2 py-1 rounded text-xs break-all font-mono">
                      {selectedSession.id}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground px-4">Scan this code or use the ID to check into this session.</p>

                </div>
              </div>

              {/* Right Column: Attendance Table */}
              <div className="lg:col-span-3">
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-border flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xl">Attendance List</h3>
                      <p className="text-xs text-muted-foreground">Updated {lastUpdate.toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-4xl font-bold text-primary">{selectedSession.attendees.length}</span>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Total</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto min-h-[400px]">
                    {selectedSession.attendees.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <Users className="w-12 h-12 mb-4 opacity-20" />
                        <p>No attendees checked in yet.</p>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-muted/50 text-left">
                          <tr>
                            <th className="px-5 py-3 text-xs font-bold text-muted-foreground uppercase">S/N</th>
                            <th className="px-5 py-3 text-xs font-bold text-muted-foreground uppercase">Name</th>
                            <th className="px-5 py-3 text-xs font-bold text-muted-foreground uppercase">Role/Details</th>
                            <th className="px-5 py-3 text-xs font-bold text-muted-foreground uppercase">Time</th>
                            <th className="px-5 py-3 text-xs font-bold text-muted-foreground uppercase">ID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {selectedSession.attendees.map((a, i) => (
                            <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-5 py-4 text-sm font-medium">{i + 1}</td>
                              <td className="px-5 py-4 font-bold">{a.name}</td>
                              <td className="px-5 py-4">
                                <div className="flex flex-col">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit mb-1 ${
                                    a.role === 'student' ? 'bg-blue-100 text-blue-700' :
                                    a.role === 'lecturer' ? 'bg-purple-100 text-purple-700' :
                                    a.role === 'exhibitor' ? 'bg-orange-100 text-orange-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {a.role.toUpperCase()}
                                  </span>
                                  {a.role === 'exhibitor' && (
                                    <span className="text-[10px] text-muted-foreground">Booth {a.boothNumber} ({a.category})</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-sm text-muted-foreground">
                                {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-5 py-4 text-xs font-mono text-muted-foreground">{a.idNumber}</td>
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
        )}
      </main>

      {/* Stats/Footer */}
      <footer className="bg-card border-t border-border py-4 px-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Swift Attend • Local Data Persistence Enabled
      </footer>
    </div>
  );
}
