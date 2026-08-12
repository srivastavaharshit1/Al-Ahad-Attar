import React, { useState, useEffect } from 'react';
import { profileService } from '../../services/profileService';
import type { User } from '../../types';
import toast from 'react-hot-toast';
import { Loader } from '../../components/ui/Loader';
import { Input } from '../../components/ui/Input';
import { PhoneInput } from '../../components/ui/PhoneInput';

export const Profile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Password state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
      await profileService.changePassword({
        oldPassword: passwordData.currentPassword,
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

  if (isLoading) return <Loader />;
  if (!profileData) return <div className="text-center p-8 text-error font-body-md leading-relaxed">{error}</div>;

  return (
    <div className="max-w-2xl">
      <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] mb-2 block">My Account</span>
      <h1 className="font-display-sm text-display-sm text-on-surface mb-8">Profile Details</h1>

      {error && (
        <div className="flex items-start gap-3 bg-error-container/20 border border-error/30 rounded-lg p-4 mb-6">
          <span className="material-symbols-outlined text-error text-[20px] flex-shrink-0 mt-0.5">error</span>
          <p className="text-sm text-error leading-relaxed">{error}</p>
        </div>
      )}

      <div className="card p-6 md:p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline-md text-headline-md text-on-surface">Personal Information</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="link-underline font-label-md text-primary flex items-center gap-1 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="material-symbols-outlined text-sm">edit</span> Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="First Name"
              type="text"
              value={profileData.firstName}
              onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
              disabled={!isEditing}
            />
            <Input
              label="Last Name"
              type="text"
              value={profileData.lastName}
              onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
              disabled={!isEditing}
            />
            <Input
              label="Email Address"
              type="email"
              value={profileData.email}
              disabled
              title="Email cannot be changed"
              className="md:col-span-2"
            />
            <PhoneInput
              label="Phone Number"
              value={profileData.phone}
              onChange={(phone) => setProfileData({ ...profileData, phone })}
              disabled={!isEditing}
              className="md:col-span-2"
            />
          </div>

          {isEditing && (
            <div className="flex justify-end gap-4 pt-4 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  fetchProfile();
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          )}
        </form>
      </div>

      <div className="card p-6 md:p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline-md text-headline-md text-on-surface">Change Password</h2>
          {!isChangingPassword && (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="link-underline font-label-md text-primary flex items-center gap-1 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="material-symbols-outlined text-sm">lock_reset</span> Change
            </button>
          )}
        </div>

        {passwordError && (
          <div className="flex items-start gap-3 bg-error-container/20 border border-error/30 rounded-lg p-4 mb-6">
            <span className="material-symbols-outlined text-error text-[20px] flex-shrink-0 mt-0.5">error</span>
            <p className="text-sm text-error leading-relaxed">{passwordError}</p>
          </div>
        )}
        {isChangingPassword && (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 max-w-md">
              <Input
                label="Current Password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required
              />
              <Input
                label="New Password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
                minLength={6}
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="flex gap-4 pt-4 border-t border-outline-variant">
              <button type="submit" className="btn btn-primary">
                Update Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordError(null);
                }}
                className="btn btn-outline"
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
