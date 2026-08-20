import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
import { Button } from '../components/ui/Button';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('This reset link is missing its token. Please request a new one.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'This reset link is invalid or has expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center py-16 md:py-24 px-margin-mobile md:px-margin-desktop bg-background">
      <div className="w-full max-w-[480px]">
        <div className="card p-8 md:p-12">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto border border-accent rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-accent text-2xl">check_circle</span>
              </div>
              <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] mb-3 block">Success</span>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Password Reset</h1>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                Redirecting you to sign in…
              </p>
            </div>
          ) : (
            <>
              <Link to="/" className="inline-flex items-center text-[11px] font-label-md uppercase tracking-wider text-on-surface-variant hover:text-accent transition-colors mb-6 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm">
                <span className="material-symbols-outlined text-[16px] mr-1 group-hover:-translate-x-1 transition-transform">arrow_back</span>
                Return to Home
              </Link>
              <div className="text-center mb-8">
                <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] mb-3 block">Reset Password</span>
                <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Choose a New Password</h1>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">Make it something you'll remember.</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-md text-sm" role="alert">
                  {error}
                </div>
              )}

              {!token && (
                <div className="mb-6 p-4 bg-[var(--warning-bg)] text-[var(--warning)] rounded-md text-sm">
                  No reset token found in this link.{' '}
                  <Link to="/forgot-password" className="link-underline font-medium">Request a new one</Link>.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="field-label" htmlFor="newPassword">New Password</label>
                  <input
                    className="field-input"
                    id="newPassword"
                    name="newPassword"
                    placeholder="••••••••"
                    required
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    className="field-input"
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="••••••••"
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="primary" size="lg" disabled={isSubmitting || !token} className="w-full">
                    <span>{isSubmitting ? 'Resetting…' : 'Reset Password'}</span>
                    {!isSubmitting && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                  </Button>
                </div>
              </form>

              <div className="mt-8 text-center">
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  Remembered it?{' '}
                  <Link
                    to="/login"
                    className="link-underline font-medium text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-sm"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
};
