export interface AttendeeRecord {
  id: string;
  name: string;
  idType: 'student' | 'lecturer';
  idNumber: string;
  timestamp: string;
  synced: boolean;
}

export interface SessionData {
  sessionId: string;
  createdAt: string;
  attendees: AttendeeRecord[];
}
