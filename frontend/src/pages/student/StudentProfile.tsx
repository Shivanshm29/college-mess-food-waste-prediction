import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../api/student';
import { LiveAnnouncer } from '../../components/LiveAnnouncer';
import {
  User as UserIcon,
  Home,
  Utensils,
  Bell,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
} from 'lucide-react';

export const StudentProfile: React.FC = () => {
  const { user, updateUserData } = useAuth();

  // Profile form state
  const [fullName, setFullName] = useState<string>(user?.full_name || '');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [hostelBlock, setHostelBlock] = useState<string>(user?.hostel_block || 'Block A');
  const [roomNumber, setRoomNumber] = useState<string>(user?.room_number || '');
  const [dietaryPref, setDietaryPref] = useState<'Vegetarian' | 'Non-Vegetarian' | 'Jain'>(
    (user?.dietary_preference as any) || 'Vegetarian'
  );
  const [cutoffHours, setCutoffHours] = useState<number>(user?.reminder_cutoff_hours ?? 2);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      const updated = await studentApi.updateProfile({
        full_name: fullName,
        email: email,
        hostel_block: hostelBlock,
        room_number: roomNumber,
        dietary_preference: dietaryPref,
        reminder_cutoff_hours: cutoffHours,
      });

      updateUserData(updated);
      setSaveSuccess(true);
      setAnnouncement('Profile and preferences updated successfully.');
    } catch (err: any) {
      setSaveError(err.message || 'Unable to update profile. Please try again.');
      setAnnouncement('Error updating profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <LiveAnnouncer message={announcement} />

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1A1D1B] tracking-tight">
          Profile & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-[#68746C] mt-0.5">
          Manage your campus residency details, dietary preferences, and cutoff notification timings.
        </p>
      </div>

      {saveSuccess && (
        <div
          role="alert"
          className="p-4 bg-[#EBF7EE] border border-[#B7E4C7] rounded-xl flex items-center gap-3 text-xs text-[#1B4332]"
        >
          <CheckCircle2 className="w-5 h-5 text-[#2D6A4F] shrink-0" />
          <span className="font-semibold">Your profile preferences have been successfully updated!</span>
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          className="p-4 bg-[#FBEBE8] border border-[#F5C2B6] rounded-xl flex items-center gap-3 text-xs text-[#9C4221]"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleProfileSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="bg-white border border-[#E8ECE6] rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F1F3F0]">
            <UserIcon className="w-4 h-4 text-[#2D6A4F]" aria-hidden="true" />
            <h2 className="text-sm font-bold text-[#1A1D1B]">Basic Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="student-name" className="block text-xs font-semibold text-[#1A1D1B] mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="student-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full text-xs bg-[#FAFBF9] border border-[#CCD5CA] rounded-lg px-3 py-2 text-[#1A1D1B] focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-none"
              />
            </div>

            <div>
              <label htmlFor="student-username" className="block text-xs font-semibold text-[#1A1D1B] mb-1">
                Roll Number / Username
              </label>
              <input
                type="text"
                id="student-username"
                value={user?.username || ''}
                disabled
                className="w-full text-xs bg-[#F4F6F2] border border-[#E2E6DF] rounded-lg px-3 py-2 text-[#8A968E] cursor-not-allowed outline-none"
              />
              <span className="text-[11px] text-[#8A968E] mt-0.5 block">Managed by university administration</span>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="student-email" className="block text-xs font-semibold text-[#1A1D1B] mb-1">
                Campus Email Address
              </label>
              <input
                type="email"
                id="student-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full text-xs bg-[#FAFBF9] border border-[#CCD5CA] rounded-lg px-3 py-2 text-[#1A1D1B] focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Hostel Residency & Room */}
        <div className="bg-white border border-[#E8ECE6] rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F1F3F0]">
            <Home className="w-4 h-4 text-[#2D6A4F]" aria-hidden="true" />
            <h2 className="text-sm font-bold text-[#1A1D1B]">Hostel Accommodation</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="hostel-block" className="block text-xs font-semibold text-[#1A1D1B] mb-1">
                Hostel Block
              </label>
              <select
                id="hostel-block"
                value={hostelBlock}
                onChange={(e) => setHostelBlock(e.target.value)}
                className="w-full text-xs bg-[#FAFBF9] border border-[#CCD5CA] rounded-lg px-3 py-2 text-[#1A1D1B] focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-none"
              >
                <option value="Block A">Block A (Senior Boys)</option>
                <option value="Block B">Block B (Junior Boys)</option>
                <option value="Block C">Block C (Girls Wing 1)</option>
                <option value="Block D">Block D (Girls Wing 2)</option>
                <option value="PG Hostel">PG & Research Scholars Hostel</option>
                <option value="Day Scholar">Day Scholar / Off-Campus</option>
              </select>
            </div>

            <div>
              <label htmlFor="room-number" className="block text-xs font-semibold text-[#1A1D1B] mb-1">
                Room Number
              </label>
              <input
                type="text"
                id="room-number"
                placeholder="e.g. 302"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full text-xs bg-[#FAFBF9] border border-[#CCD5CA] rounded-lg px-3 py-2 text-[#1A1D1B] focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Dietary Preference */}
        <div className="bg-white border border-[#E8ECE6] rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F1F3F0]">
            <Utensils className="w-4 h-4 text-[#2D6A4F]" aria-hidden="true" />
            <h2 className="text-sm font-bold text-[#1A1D1B]">Dietary Preferences</h2>
          </div>

          <p className="text-xs text-[#68746C]">
            Helps the mess plan appropriate portions for special counters (e.g., Jain / pure veg sections).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Dietary preference">
            {(['Vegetarian', 'Non-Vegetarian', 'Jain'] as const).map((pref) => (
              <button
                key={pref}
                type="button"
                role="radio"
                aria-checked={dietaryPref === pref}
                onClick={() => setDietaryPref(pref)}
                className={`p-3 text-xs font-semibold rounded-lg border text-left transition-all ${
                  dietaryPref === pref
                    ? 'bg-[#EBF7EE] border-[#2D6A4F] text-[#1B4332] ring-1 ring-[#2D6A4F]'
                    : 'bg-[#FAFBF9] border-[#E8ECE6] text-[#4C554F] hover:border-[#CCD5CA]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{pref}</span>
                  {dietaryPref === pref && <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 4: Cutoff Notification Preferences */}
        <div className="bg-white border border-[#E8ECE6] rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F1F3F0]">
            <Bell className="w-4 h-4 text-[#2D6A4F]" aria-hidden="true" />
            <h2 className="text-sm font-bold text-[#1A1D1B]">Reminder Timing</h2>
          </div>

          <div className="space-y-1">
            <label htmlFor="cutoff-hours" className="block text-xs font-semibold text-[#1A1D1B] mb-1">
              Notify me before meal response cutoff
            </label>
            <select
              id="cutoff-hours"
              value={cutoffHours}
              onChange={(e) => setCutoffHours(Number(e.target.value))}
              className="w-full sm:w-64 text-xs bg-[#FAFBF9] border border-[#CCD5CA] rounded-lg px-3 py-2 text-[#1A1D1B] focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-none"
            >
              <option value={1}>1 hour before cutoff</option>
              <option value={2}>2 hours before cutoff (Recommended)</option>
              <option value={3}>3 hours before cutoff</option>
            </select>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#2D6A4F]"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Profile Preferences'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
