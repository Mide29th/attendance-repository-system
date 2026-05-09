import { AttendeeRecord, SessionData, SessionType, UserRole } from '../types';

const SESSIONS_KEY = 'swift_attend_sessions';
const OFFLINE_QUEUE_KEY = 'swift_attend_offline_queue';

class AttendanceService {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.migrateLegacyData();
  }

  // Migrate from single session storage to multi-session
  private migrateLegacyData(): void {
    const legacy = localStorage.getItem('swift_attend_session');
    if (legacy) {
      try {
        const session = JSON.parse(legacy);
        // Map old structure to new structure if needed
        const migrated: SessionData = {
          id: session.sessionId || session.id || this.generateId(),
          name: 'Default Session',
          type: 'check-in',
          createdAt: session.createdAt || new Date().toISOString(),
          isActive: true,
          formConfig: {
            allowedRoles: ['student', 'lecturer', 'exhibitor', 'attendee'],
            requireIdNumber: true,
            collectBoothInfo: true
          },
          attendees: session.attendees.map((a: any) => ({

            ...a,
            sessionId: session.sessionId || session.id || 'default'
          }))
        };
        this.saveSessions([migrated]);
        localStorage.removeItem('swift_attend_session');
      } catch (e) {
        console.error('Failed to migrate legacy data', e);
      }
    }
  }

  // Get all sessions
  getSessions(): SessionData[] {
    const stored = localStorage.getItem(SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Get specific session
  getSession(id: string): SessionData | undefined {
    return this.getSessions().find(s => s.id === id);
  }

  // Create new session with form config
  createSession(name: string, type: SessionType, formConfig?: SessionData['formConfig']): SessionData {

    const sessions = this.getSessions();
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    const id = `${slug}-${Math.random().toString(36).substr(2, 5)}`;
    
    const newSession: SessionData = {
      id,
      name,
      type,
      createdAt: new Date().toISOString(),
      isActive: true,
      formConfig: formConfig || {
        allowedRoles: ['student', 'lecturer', 'exhibitor', 'attendee'],
        requireIdNumber: true,
        collectBoothInfo: true
      },
      attendees: []
    };
    sessions.push(newSession);
    this.saveSessions(sessions);
    return newSession;
  }

  // Update existing session

  updateSession(sessionId: string, updates: Partial<SessionData>): SessionData | undefined {
    let sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index === -1) return undefined;

    sessions[index] = { ...sessions[index], ...updates };
    this.saveSessions(sessions);
    return sessions[index];
  }




  // Save all sessions to localStorage
  private saveSessions(sessions: SessionData[]): void {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    this.notifyListeners();
  }

  private generateId(): string {
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Check if attendee already exists in a session
  isDuplicate(sessionId: string, idNumber: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;
    return session.attendees.some(a => a.idNumber === idNumber);
  }

  // Add new attendee to a specific session
  addAttendee(
    sessionId: string,
    name: string, 
    role: UserRole, 
    idNumber: string,
    boothNumber?: string,
    category?: string
  ): boolean {
    const session = this.getSession(sessionId);
    if (!session || this.isDuplicate(sessionId, idNumber)) {
      return false;
    }

    const newAttendee: AttendeeRecord = {
      id: this.generateId(),
      sessionId,
      name,
      role,
      idNumber,
      boothNumber,
      category,
      timestamp: new Date().toISOString(),
      synced: navigator.onLine
    };

    const sessions = this.getSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex !== -1) {
      sessions[sessionIndex].attendees.push(newAttendee);
      this.saveSessions(sessions);
    }

    // If offline, add to queue
    if (!navigator.onLine) {
      this.addToOfflineQueue(newAttendee);
    }

    return true;
  }

  // Offline queue management
  private addToOfflineQueue(attendee: AttendeeRecord): void {
    const queue = this.getOfflineQueue();
    queue.push(attendee);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  }

  private getOfflineQueue(): AttendeeRecord[] {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Sync offline data
  async syncOfflineData(): Promise<void> {
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return;

    const sessions = this.getSessions();
    
    // Mark items as synced in sessions
    queue.forEach(queuedItem => {
      const session = sessions.find(s => s.id === queuedItem.sessionId);
      if (session) {
        const attendee = session.attendees.find(a => a.id === queuedItem.id);
        if (attendee) {
          attendee.synced = true;
        }
      }
    });

    this.saveSessions(sessions);
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  }

  // Subscribe to changes
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  // Delete session
  deleteSession(id: string): void {
    const sessions = this.getSessions().filter(s => s.id !== id);
    this.saveSessions(sessions);
  }

  // Export session data
  getExportData(sessionId: string): any[] {
    const session = this.getSession(sessionId);
    if (!session) return [];
    
    return session.attendees.map((a, index) => ({
      'S/N': index + 1,
      'Name': a.name,
      'Role': a.role.charAt(0).toUpperCase() + a.role.slice(1),
      'ID Number': a.idNumber,
      'Booth': a.boothNumber || 'N/A',
      'Category': a.category || 'N/A',
      'Time': new Date(a.timestamp).toLocaleString()
    }));
  }

  // Clear all data (Danger Zone)
  clearAllData(): void {
    localStorage.removeItem(SESSIONS_KEY);
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    this.notifyListeners();
  }
}

export const attendanceService = new AttendanceService();
