import { AttendeeRecord, SessionData, SessionType, UserRole } from '../types';
import { supabase } from '../lib/supabase';

class AttendanceService {
  private listeners: Set<() => void> = new Set();
  private sessionCache: SessionData[] = [];

  constructor() {
    this.refreshCache();
  }

  // Refresh local cache from Supabase
  async refreshCache(): Promise<void> {
    try {
      const { data: sessions, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (sessionError) throw sessionError;

      const fullSessions: SessionData[] = await Promise.all((sessions || []).map(async (s: any) => {
        const { data: attendees, error: attendeeError } = await supabase
          .from('attendees')
          .select('*')
          .eq('session_id', s.id);

        if (attendeeError) throw attendeeError;

        return {
          id: s.id,
          name: s.name,
          type: s.type,
          slug: s.slug,
          createdAt: s.created_at,
          isActive: true,
          formConfig: s.form_config,
          attendees: (attendees || []).map((a: any) => ({
            id: a.id,
            sessionId: a.session_id,
            name: a.data.name,
            role: a.data.role,
            idNumber: a.data.idNumber,
            timestamp: a.timestamp,
            synced: true,
            boothNumber: a.data.boothNumber,
            category: a.data.category
          }))
        };
      }));

      this.sessionCache = fullSessions;
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to refresh attendance cache from Supabase', e);
    }
  }

  // Update existing session
  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<SessionData | undefined> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .update({
          name: updates.name,
          type: updates.type,
          form_config: updates.formConfig
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      await this.refreshCache();
      return this.sessionCache.find(s => s.id === sessionId);
    } catch (e) {
      console.error('Failed to update session in Supabase', e);
      return undefined;
    }
  }

  // Save all sessions to localStorage - DEPRECATED
  private saveSessions(sessions: SessionData[]): void {
    // We now use Supabase, but keeping notify for cache updates
    this.notifyListeners();
  }

  // Get all sessions (from cache)
  getSessions(): SessionData[] {
    return this.sessionCache;
  }

  // Get specific session (from cache or DB)
  async getSession(id: string): Promise<SessionData | undefined> {
    // Try cache first
    const cached = this.sessionCache.find(s => s.id === id);
    if (cached) return cached;

    // Fetch from DB if not in cache
    try {
      const { data: s, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (sessionError || !s) return undefined;

      const { data: attendees, error: attendeeError } = await supabase
        .from('attendees')
        .select('*')
        .eq('session_id', s.id);

      if (attendeeError) throw attendeeError;

      return {
        id: s.id,
        name: s.name,
        type: s.type,
        slug: s.slug,
        createdAt: s.created_at,
        isActive: true,
        formConfig: s.form_config,
        attendees: (attendees || []).map((a: any) => ({
          id: a.id,
          sessionId: a.session_id,
          name: a.data.name,
          role: a.data.role,
          idNumber: a.data.idNumber,
          timestamp: a.timestamp,
          synced: true,
          boothNumber: a.data.boothNumber,
          category: a.data.category
        }))
      };
    } catch (e) {
      console.error('Failed to fetch session from Supabase', e);
      return undefined;
    }
  }

  // Create new session
  async createSession(name: string, type: SessionType, formConfig?: SessionData['formConfig']): Promise<SessionData | null> {
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    const config = formConfig || {
      allowedRoles: ['student', 'lecturer', 'exhibitor', 'attendee'],
      requireIdNumber: true,
      collectBoothInfo: true
    };

    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert([{
          name,
          type,
          slug: `${slug}-${Math.random().toString(36).substr(2, 5)}`,
          form_config: config
        }])
        .select()
        .single();

      if (error) throw error;

      const newSession: SessionData = {
        id: data.id,
        name: data.name,
        type: data.type,
        slug: data.slug,
        createdAt: data.created_at,
        isActive: true,
        formConfig: data.form_config,
        attendees: []
      };

      this.sessionCache.unshift(newSession);
      this.notifyListeners();
      return newSession;
    } catch (e) {
      console.error('Failed to create session in Supabase', e);
      return null;
    }
  }

  // Add new attendee
  async addAttendee(
    sessionId: string,
    name: string, 
    role: UserRole, 
    idNumber: string,
    boothNumber?: string,
    category?: string
  ): Promise<boolean> {
    try {
      // Check for duplicate in DB
      const { data: existing, error: checkError } = await supabase
        .from('attendees')
        .select('id')
        .eq('session_id', sessionId)
        .filter('data->>idNumber', 'eq', idNumber)
        .limit(1);

      if (checkError) throw checkError;
      if (existing && existing.length > 0) return false;

      const { error } = await supabase
        .from('attendees')
        .insert([{
          session_id: sessionId,
          data: {
            name,
            role,
            idNumber,
            boothNumber,
            category
          }
        }]);

      if (error) throw error;

      await this.refreshCache(); // Sync local cache
      return true;
    } catch (e) {
      console.error('Failed to add attendee to Supabase', e);
      return false;
    }
  }

  // Sync offline data - Placeholder as Supabase handles some of this, but we can implement specific logic if needed
  async syncOfflineData(): Promise<void> {
    await this.refreshCache();
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
  async deleteSession(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      this.sessionCache = this.sessionCache.filter(s => s.id !== id);
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to delete session from Supabase', e);
    }
  }

  // Export session data
  async getExportData(sessionId: string): Promise<any[]> {
    const session = await this.getSession(sessionId);
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
  async clearAllData(): Promise<void> {
    try {
      const { error } = await supabase.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      this.sessionCache = [];
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to clear data from Supabase', e);
    }
  }

  // Delete specific attendee
  async deleteAttendee(sessionId: string, attendeeId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('attendees')
        .delete()
        .eq('id', attendeeId);

      if (error) throw error;
      await this.refreshCache();
    } catch (e) {
      console.error('Failed to delete attendee from Supabase', e);
    }
  }

  // Get synchronization data (QR codes)
  getSyncData(sessionId: string): string | null {
    const session = this.sessionCache.find(s => s.id === sessionId);
    if (!session) return null;
    
    // With Supabase, the sync data is just the Session ID because the device will fetch the rest from DB
    const syncObj = {
      i: session.id, // ID
      n: session.name,
      t: session.type,
      c: session.formConfig
    };
    
    try {
      return btoa(JSON.stringify(syncObj));
    } catch (e) {
      console.error('Failed to encode sync data', e);
      return null;
    }
  }

  // Import a session from sync data
  async importSession(syncData: string): Promise<SessionData | null> {
    try {
      const syncObj = JSON.parse(atob(syncData));
      const sessionId = syncObj.i;
      
      const existing = await this.getSession(sessionId);
      if (existing) return existing;

      // If not in DB, it might be a temporary session or we need to create it
      // But usually, it should exist in DB if generated by an admin.
      // We return the metadata from syncObj as fallback if DB fails
      return {
        id: sessionId,
        name: syncObj.n,
        type: syncObj.t,
        formConfig: syncObj.c,
        createdAt: new Date().toISOString(),
        isActive: true,
        attendees: []
      };
    } catch (e) {
      console.error('Failed to import session', e);
      return null;
    }
  }
}

export const attendanceService = new AttendanceService();

