import React, { useState, useEffect } from 'react';
import { profileService } from '../../services/profileService';
import type { User } from '../../types';
import toast from 'react-hot-toast';

export const Profile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Password state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const res = await profileService.getProfile();
      setProfileData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData) return;
    try {
      setError(null);
      setSuccessMsg(null);
      await profileService.updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone
      });
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    
    try {
      setPasswordError(null);
      setPasswordSuccess(null);
      await profileService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password changed successfully');
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    }
  };

  if (isLoading) return <div className="text-center p-8">Loading profile...</div>;
  if (!profileData) return <div className="text-center p-8 text-error">{error}</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display-sm text-display-sm text-on-surface mb-8">Profile Details</h1>
      
      {error && <div className="bg-error-container text-on-error-container p-4 rounded mb-6">{error}</div>}
      {successMsg && <div className="bg-[#f0fdf4] text-[#166534] p-4 rounded mb-6">{successMsg}</div>}

      <div className="bg-surface-container-lowest border border-outline-variant p-6 md:p-8 rounded-DEFAULT mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline-md text-headline-md">Personal Information</h2>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="text-primary font-label-md hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">edit</span> Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-label-md text-on-surface-variant mb-2">First Name</label>
              <input 
                type="text" 
                value={profileData.firstName}
                onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                disabled={!isEditing}
                className="w-full bg-surface border border-outline-variant rounded px-4 py-2 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-70 disabled:bg-surface-container-low"
              />
            </div>
            <div>
              <label className="block font-label-md text-on-surface-variant mb-2">Last Name</label>
              <input 
                type="text" 
                value={profileData.lastName}
                onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                disabled={!isEditing}
                className="w-full bg-surface border border-outline-variant rounded px-4 py-2 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-70 disabled:bg-surface-container-low"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-label-md text-on-surface-variant mb-2">Email Address</label>
              <input 
                type="email" 
                value={profileData.email}
                disabled
                className="w-full bg-surface-container-low border border-outline-variant rounded px-4 py-2 opacity-70 cursor-not-allowed"
                title="Email cannot be changed"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-label-md text-on-surface-variant mb-2">Phone Number</label>
              <input 
                type="tel" 
                value={profileData.phone}
                onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                disabled={!isEditing}
                className="w-full bg-surface border border-outline-variant rounded px-4 py-2 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-70 disabled:bg-surface-container-low"
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-4 pt-4 border-t border-outline-variant">
              <button 
                type="button" 
                onClick={() => {
                  setIsEditing(false);
                  fetchProfile();
                }}
                className="btn-outline px-6 py-2"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary px-6 py-2">
                Save Changes
              </button>
            </div>
          )}
        </form>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant p-6 md:p-8 rounded-DEFAULT mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline-md text-headline-md">Change Password</h2>
          {!isChangingPassword && (
            <button 
              onClick={() => setIsChangingPassword(true)}
              className="text-primary font-label-md hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">lock_reset</span> Change
            </button>
          )}
        </div>

        {passwordError && <div className="bg-error-container text-on-error-container p-4 rounded mb-6">{passwordError}</div>}
        {passwordSuccess && <div className="bg-[#f0fdf4] text-[#166534] p-4 rounded mb-6">{passwordSuccess}</div>}

        {isChangingPassword && (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 max-w-md">
              <div>
                <label className="block font-label-md text-on-surface-variant mb-2">Current Password</label>
                <input 
                  type="password" 
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  required
                  className="w-full bg-surface border border-outline-variant rounded px-4 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block font-label-md text-on-surface-variant mb-2">New Password</label>
                <input 
                  type="password" 
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  required
                  minLength={6}
                  className="w-full bg-surface border border-outline-variant rounded px-4 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block font-label-md text-on-surface-variant mb-2">Confirm New Password</label>
                <input 
                  type="password" 
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  required
                  minLength={6}
                  className="w-full bg-surface border border-outline-variant rounded px-4 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-outline-variant">
              <button type="submit" className="btn-primary px-6 py-2">
                Update Password
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordError(null);
                }}
                className="btn-outline px-6 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
