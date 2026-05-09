import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { attendanceService } from '../services/attendanceService';
import { SessionData } from '../types';
import { Calendar, ChevronRight, LayoutDashboard, QrCode, ArrowRight } from 'lucide-react';

export function Home() {
  const [sessions, setSessions] = useState<SessionData[]>([]);

  useEffect(() => {
    // Load sessions and filter for active ones
    const allSessions = attendanceService.getSessions();
    setSessions(allSessions.filter(s => s.isActive));
    
    // Subscribe to changes in case sessions are updated/added while page is open
    const unsubscribe = attendanceService.subscribe(() => {
      setSessions(attendanceService.getSessions().filter(s => s.isActive));
    });
    
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl">
        {/* Header Section */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl mb-6 shadow-sm border border-primary/5">
            <QrCode className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 text-foreground">
            Swift Attend
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
            Welcome! Please select an active session below to proceed with your check-in or registration.
          </p>
        </div>

        {/* Sessions List */}
        <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          {sessions.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center shadow-sm">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <h3 className="text-xl font-bold mb-2">No Active Sessions</h3>
              <p className="text-muted-foreground mb-8">
                There are currently no sessions available for check-in.
              </p>
              <Link 
                to="/admin" 
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                <LayoutDashboard className="w-5 h-5" />
                Go to Management Console
              </Link>
            </div>
          ) : (
            sessions.map((session, index) => (
              <Link 
                key={session.id}
                to={`/checkin/${session.id}`}
                className="group bg-card border border-border rounded-2xl p-6 hover:border-primary/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors border border-transparent group-hover:border-primary/10">
                    <Calendar className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] uppercase tracking-widest font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                        {session.type}
                      </span>
                      {session.attendees.length > 0 && (
                        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                          {session.attendees.length} Joined
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                      {session.name}
                    </h3>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm">
                  <ArrowRight className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Footer Navigation */}
        <div className="mt-16 text-center border-t border-border pt-10 animate-in fade-in duration-1000 delay-500">
          <p className="text-xs uppercase tracking-widest font-black text-muted-foreground mb-6">
            Quick Navigation
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            <Link to="/directory" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-2 group">
              Exhibitor Directory
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <div className="hidden sm:block w-1.5 h-1.5 bg-border rounded-full" />
            <Link to="/admin" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group">
              Admin Portal
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
