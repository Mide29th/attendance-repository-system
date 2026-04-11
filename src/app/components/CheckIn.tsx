import { useState } from 'react';
import { attendanceService } from '../services/attendanceService';
import { CheckCircle2, UserCircle, Hash } from 'lucide-react';

export function CheckIn() {
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idType, setIdType] = useState<'student' | 'lecturer'>('student');
  const [status, setStatus] = useState<'idle' | 'success' | 'duplicate' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !idNumber.trim()) {
      setStatus('error');
      return;
    }

    setIsSubmitting(true);

    // Simulate brief loading
    await new Promise(resolve => setTimeout(resolve, 300));

    const success = attendanceService.addAttendee(name.trim(), idType, idNumber.trim());

    if (success) {
      setStatus('success');
      setName('');
      setIdNumber('');

      // Reset success message after 3 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
    } else {
      setStatus('duplicate');
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
    }

    setIsSubmitting(false);
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
          <h1 className="text-2xl mb-2">Checked In Successfully!</h1>
          <p className="text-muted-foreground">Thank you for attending</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl mb-2">Swift Attend</h1>
          <p className="text-muted-foreground">Check-In</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ID Type Toggle */}
          <div className="bg-muted rounded-lg p-1 flex gap-1">
            <button
              type="button"
              onClick={() => setIdType('student')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                idType === 'student'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => setIdType('lecturer')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                idType === 'lecturer'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Lecturer
            </button>
          </div>

          {/* Name Input */}
          <div>
            <label className="block mb-2">Name</label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </div>

          {/* ID Number Input */}
          <div>
            <label className="block mb-2">
              {idType === 'student' ? 'Matric Number' : 'Lecturer ID'}
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder={idType === 'student' ? 'e.g., MAT/2023/001' : 'e.g., LEC/001'}
                className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </div>

          {/* Error Messages */}
          {status === 'duplicate' && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
              Already checked in
            </div>
          )}

          {status === 'error' && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
              Please fill in all fields
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? 'Checking In...' : 'CHECK-IN'}
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
