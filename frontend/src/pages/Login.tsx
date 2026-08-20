import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { GoogleLogin } from '@react-oauth/google';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [googleToken, setGoogleToken] = useState('');
  const [phone, setPhone] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin } = useAuth();

  const from = location.state?.from?.pathname || '/account/dashboard';

  const handleGoogleSuccess = async (credential: string) => {
    setError('');
    setIsSubmitting(true);
    try {
      await googleLogin(credential);
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.response?.data?.message === 'REQUIRES_PHONE') {
        setGoogleToken(credential);
        setShowPhoneModal(true);
      } else {
        setError(err.response?.data?.message || 'Google login failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await googleLogin(googleToken, phone);
      setShowPhoneModal(false);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center py-16 md:py-24 px-margin-mobile md:px-margin-desktop bg-background">
      <div className="w-full max-w-[480px]">
        <div className="card p-8 md:p-12">
          <Link to="/" className="inline-flex items-center text-[11px] font-label-md uppercase tracking-wider text-on-surface-variant hover:text-accent transition-colors mb-6 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm">
            <span className="material-symbols-outlined text-[16px] mr-1 group-hover:-translate-x-1 transition-transform">arrow_back</span>
            Return to Home
          </Link>
          <div className="text-center mb-8">
            <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] mb-3 block">Welcome Back</span>
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Sign In</h1>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">Continue your olfactory journey.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-md text-sm" role="alert">
              {error}
            </div>
          )}

          {showPhoneModal ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-5 relative z-10">
              <p className="text-sm text-on-surface-variant mb-4">
                Please enter your phone number to complete your Google registration.
              </p>
              <Input
                label="Phone Number"
                id="phone"
                name="phone"
                placeholder="+91..."
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <div className="pt-2 flex gap-4">
                <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setShowPhoneModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? 'Submitting…' : 'Complete'}
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex justify-center mb-6 relative z-10">
                <GoogleLogin
                  onSuccess={(res) => {
                    if (res.credential) handleGoogleSuccess(res.credential);
                  }}
                  onError={() => setError('Google login was unsuccessful.')}
                  useOneTap
                  theme="outline"
                  shape="rectangular"
                  width="100%"
                  text="signin_with"
                />
              </div>

              <div className="relative flex items-center py-5">
                <div className="flex-grow border-t border-outline-variant"></div>
                <span className="flex-shrink-0 mx-4 text-on-surface-variant font-label-md text-[11px] uppercase tracking-wider">or sign in with email</span>
                <div className="flex-grow border-t border-outline-variant"></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
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

                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <label className="field-label !mb-0" htmlFor="password">Password</label>
                    <Link
                      to="/forgot-password"
                      className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant hover:text-accent-hover focus-visible:outline-none focus-visible:text-accent-hover transition-colors duration-300"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <input
                    className="field-input"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="w-full">
                    <span>{isSubmitting ? 'Signing in…' : 'Sign In'}</span>
                    {!isSubmitting && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                  </Button>
                </div>
              </form>

              <div className="mt-8 text-center relative z-10">
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    className="link-underline font-medium text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-sm"
                  >
                    Register
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
