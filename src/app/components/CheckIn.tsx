import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { attendanceService } from '../services/attendanceService';
import { UserRole, SessionData } from '../types';
import { CheckCircle2, UserCircle, Hash, Store, LayoutGrid, Info, Copy, Check } from 'lucide-react';


// Roles whose IDs are system-generated (not entered by user)
const AUTO_ID_ROLES: UserRole[] = ['exhibitor', 'attendee'];

function generateId(role: UserRole): string {
  const prefix = role === 'exhibitor' ? 'EXH' : 'REG';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusable chars
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${suffix}`;
}


export function CheckIn() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionData | undefined>();
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [boothNumber, setBoothNumber] = useState('');
  const [category, setCategory] = useState('');
  const [role, setRole] = useState<UserRole>('attendee');
  const [status, setStatus] = useState<'idle' | 'success' | 'duplicate' | 'error' | 'invalid_session'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedId, setGeneratedId] = useState('');
  const [copied, setCopied] = useState(false);

  // Whether current role gets an auto-generated ID
  const isAutoId = AUTO_ID_ROLES.includes(role);

  useEffect(() => {
    if (sessionId) {
      // Check for sync data in URL if session not found locally
      const params = new URLSearchParams(window.location.search);
      const syncData = params.get('s');
      if (syncData) {
        attendanceService.importSession(syncData, sessionId);
      }

      // Load the specific session from the URL
      const activeSession = attendanceService.getSession(sessionId);
      if (activeSession) {
        setSession(activeSession);
        if (activeSession.formConfig.allowedRoles.length > 0) {
          setRole(activeSession.formConfig.allowedRoles[0]);
        }
      } else {
        setStatus('invalid_session');
      }
    } else {
      // No sessionId in URL — auto-load the first active session
      const allSessions = attendanceService.getSessions();
      const activeSession = allSessions.find(s => s.isActive);
      if (activeSession) {
        setSession(activeSession);
        if (activeSession.formConfig.allowedRoles.length > 0) {
          setRole(activeSession.formConfig.allowedRoles[0]);
        }
      }
      // If no sessions exist yet, the form still renders as General Check-In
    }
  }, [sessionId]);


  const categories = [
    'WEB DEVELOPMENT',
    'FASHION DESIGN (MALE)',
    'FASHION DESIGN (FEMALE)',
    'CATERING',
    'BAKING',
    '3D- EPOXY',
    'AUTOGELE',
    'BAG MAKING',
    'BATIK',
    'BASIC FARMING/AGRO-ALLIED',
    'BEAD-HAT MAKING',
    'HAIRDRESSING',
    'GRAPHICS DESIGN',
    'DIGITAL MARKETING',
    'CLEANING AGENTS',
    'PHOTOGRAPHY',
    'MAKEUP',
    'PAINT PRODUCTION',
    'INTERIOR DÉCOR',
    'VIDEOGRAPHY',
    'SHOE MAKING'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (role === 'exhibitor' && (!boothNumber.trim() || !category.trim())) {
      setStatus('error');
      return;
    }

    setIsSubmitting(true);

    // Simulate brief loading
    await new Promise(resolve => setTimeout(resolve, 400));

    // Auto-generate ID for exhibitor and attendee roles
    const finalId = isAutoId ? generateId(role) : idNumber.trim();

    const success = attendanceService.addAttendee(
      sessionId || session?.id || 'default',
      name.trim(),
      role,
      finalId,
      role === 'exhibitor' ? boothNumber.trim() : undefined,
      role === 'exhibitor' ? category.trim() : undefined
    );

    if (success) {
      if (isAutoId) setGeneratedId(finalId);
      setStatus('success');
      setName('');
      setIdNumber('');
      setBoothNumber('');
      setCategory('');
    } else {
      setStatus('duplicate');
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
    }

    setIsSubmitting(false);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(generatedId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRegisterAnother = () => {
    setStatus('idle');
    setGeneratedId('');
    setCopied(false);
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-1">
            {isAutoId ? 'Registered Successfully!' : 'Checked In Successfully!'}
          </h1>
          <p className="text-muted-foreground mb-6">Thank you for attending</p>

          {/* Generated ID display */}
          {generatedId && (
            <div className="bg-muted rounded-xl p-5 mb-6">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">
                Your {role === 'exhibitor' ? 'Exhibition' : 'Registration'} ID
              </p>
              <div className="flex items-center justify-center gap-3">
                <code className="text-2xl font-bold tracking-widest text-primary font-mono">
                  {generatedId}
                </code>
                <button
                  onClick={handleCopyId}
                  title="Copy ID"
                  className="p-2 rounded-lg hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Please save this ID — you'll need it for future reference.
              </p>
            </div>
          )}

          <button
            onClick={handleRegisterAnother}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold hover:opacity-90 transition-opacity"
          >
            Register Another Person
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl mb-1 text-primary font-bold">Swift Attend</h1>
          {session ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Info className="w-4 h-4" />
              <p className="text-sm font-medium">{session.name}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">General Check-In</p>
          )}
        </div>

        {status === 'invalid_session' && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg text-center">
            <p className="font-bold">Invalid Session</p>
            <p className="text-sm">This check-in link is no longer active.</p>
          </div>
        )}


        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Toggle */}
          {session && session.formConfig.allowedRoles.length > 1 && (
            <div className="bg-muted rounded-lg p-1 grid grid-cols-2 gap-1 sm:grid-cols-4">
              {session.formConfig.allowedRoles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-2 px-2 rounded-md text-xs transition-colors font-bold ${
                    role === r
                      ? 'bg-background shadow-sm text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          )}


          {/* Name Input */}
          <div>
            <label className="block mb-2 font-bold text-sm">Full Name</label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full pl-10 pr-4 py-3 bg-muted/50 rounded-lg outline-none focus:ring-2 focus:ring-primary border border-transparent focus:border-primary transition-all"
                required
              />
            </div>
          </div>

          {/* ID Number Input — only for roles that need manual entry */}
          {(!session || session.formConfig.requireIdNumber) && !isAutoId && (
            <div>
              <label className="block mb-2 font-bold text-sm">
                {role === 'student' ? 'Matric Number' : 'Lecturer ID'}
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="Enter your unique ID"
                  className="w-full pl-10 pr-4 py-3 bg-muted/50 rounded-lg outline-none focus:ring-2 focus:ring-primary border border-transparent focus:border-primary transition-all"
                  required={session?.formConfig.requireIdNumber}
                />
              </div>
            </div>
          )}

          {/* Auto-ID notice for exhibitor / attendee */}
          {isAutoId && (
            <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
              <Hash className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your <span className="font-bold text-foreground">
                  {role === 'exhibitor' ? 'Exhibition ID' : 'Registration ID'}
                </span> will be automatically generated after you submit.
              </p>
            </div>
          )}


          {/* Exhibitor Specific Fields */}
          {role === 'exhibitor' && (!session || session.formConfig.collectBoothInfo) && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div>
                <label className="block mb-2 font-bold text-sm">Booth Number</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={boothNumber}
                    onChange={(e) => setBoothNumber(e.target.value)}
                    placeholder="e.g., A12"
                    className="w-full pl-10 pr-4 py-3 bg-muted/50 rounded-lg outline-none focus:ring-2 focus:ring-primary border border-transparent focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 font-bold text-sm">Category</label>
                <div className="relative">
                  <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-muted/50 rounded-lg outline-none focus:ring-2 focus:ring-primary border border-transparent focus:border-primary appearance-none transition-all"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}


          {/* Error Messages */}
          {status === 'duplicate' && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm font-medium">
              ⚠️ Already registered — this ID is already in the system.
            </div>
          )}

          {status === 'error' && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm font-medium">
              ⚠️ Please fill in all required fields.
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'REGISTER / CHECK-IN'}
          </button>
        </form>

        {/* Offline Indicator */}
        {!navigator.onLine && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            📡 Offline mode - data will sync when connected
          </div>
        )}
      </div>
    </div>
  );
}
