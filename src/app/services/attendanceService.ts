import { AttendeeRecord, SessionData } from '../types';

const STORAGE_KEY = 'swift_attend_session';
const OFFLINE_QUEUE_KEY = 'swift_attend_offline_queue';

class AttendanceService {
  private listeners: Set<() => void> = new Set();

  // Get current session or create a new one
  getCurrentSession(): SessionData {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    const newSession: SessionData = {
      sessionId: this.generateSessionId(),
      createdAt: new Date().toISOString(),
      attendees: []
    };

    this.saveSession(newSession);
    return newSession;
  }

  // Save session to localStorage
  private saveSession(session: SessionData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.notifyListeners();
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Check if attendee already exists
  isDuplicate(idNumber: string): boolean {
    const session = this.getCurrentSession();
    return session.attendees.some(a => a.idNumber === idNumber);
  }

  // Add new attendee
  addAttendee(name: string, idType: 'student' | 'lecturer', idNumber: string): boolean {
    if (this.isDuplicate(idNumber)) {
      return false;
    }

    const session = this.getCurrentSession();
    const newAttendee: AttendeeRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      idType,
      idNumber,
      timestamp: new Date().toISOString(),
      synced: navigator.onLine
    };

    session.attendees.push(newAttendee);
    this.saveSession(session);

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

  // Sync offline data when connection is restored
  async syncOfflineData(): Promise<void> {
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return;

    // Mark all queued items as synced
    const session = this.getCurrentSession();
    session.attendees = session.attendees.map(a => ({
      ...a,
      synced: true
    }));

    this.saveSession(session);
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  }

  // Get all attendees
  getAttendees(): AttendeeRecord[] {
    return this.getCurrentSession().attendees;
  }

  // Get total count
  getTotalCount(): number {
    return this.getCurrentSession().attendees.length;
  }

  // Clear session (for new sessions)
  clearSession(): void {
    const newSession: SessionData = {
      sessionId: this.generateSessionId(),
      createdAt: new Date().toISOString(),
      attendees: []
    };
    this.saveSession(newSession);
  }

  // Subscribe to changes
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  // Export to Excel format
  getExportData(): any[] {
    const attendees = this.getAttendees();
    return attendees.map((a, index) => ({
      'S/N': index + 1,
      'Name': a.name,
      'ID Type': a.idType === 'student' ? 'Student' : 'Lecturer',
      'ID Number': a.idNumber,
      'Time': new Date(a.timestamp).toLocaleString()
    }));
  }
}

export const attendanceService = new AttendanceService();
