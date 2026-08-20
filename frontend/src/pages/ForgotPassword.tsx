import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center py-16 md:py-24 px-margin-mobile md:px-margin-desktop bg-background">
      <div className="w-full max-w-[480px]">
        <div className="card p-8 md:p-12">
          {submitted ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto border border-accent rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-accent text-2xl">mark_email_read</span>
              </div>
              <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] mb-3 block">Check Your Inbox</span>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Reset Link Sent</h1>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-8">
                If an account exists for <span className="text-on-surface font-medium">{email}</span>, a password reset link is on its way. It expires in 30 minutes.
              </p>
              <Link to="/login" className="btn btn-outline w-full">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <Link to="/" className="inline-flex items-center text-[11px] font-label-md uppercase tracking-wider text-on-surface-variant hover:text-accent transition-colors mb-6 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm">
                <span className="material-symbols-outlined text-[16px] mr-1 group-hover:-translate-x-1 transition-transform">arrow_back</span>
                Return to Home
              </Link>
              <div className="text-center mb-8">
                <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] mb-3 block">Forgot Password</span>
                <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Reset Your Password</h1>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">Enter your email and we'll send you a link to reset it.</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-md text-sm" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Email Address"
                  id="email"
                  name="email"
                  placeholder="your@email.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <div className="pt-2">
                  <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="w-full">
                    <span>{isSubmitting ? 'Sending…' : 'Send Reset Link'}</span>
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
