import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { GoogleLogin } from '@react-oauth/google';

// ─── Stitch Design Token Helpers ────────────────────────────────────────────
const C = {
  bg: '#f9f8f6',
  card: '#ffffff',
  border: '#e8e0d0',
  navy: '#1c2533',
  navyLight: '#4a5568',
  gold: '#8b6914',
  goldBg: '#fdf8ee',
  goldBorder: '#c9a227',
  goldDark: '#755811',
  success: '#2f7a4a',
  error: '#c0392b',
  inputBg: '#fbfaf8'
};

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Google Auth Phone Modal state
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [googleToken, setGoogleToken] = useState('');
  const [phone, setPhone] = useState('');

  // Validation State
  const [formErrors, setFormErrors] = useState<{ email?: string, phone?: string }>({});
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin } = useAuth();

  const from = location.state?.from?.pathname || '/account/dashboard';

  // ─── Validation Helpers ───
  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const validatePhone = (val: string) => /^\d{10}$/.test(val);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (formErrors.email && validateEmail(val)) {
      setFormErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handleEmailBlur = () => {
    if (email && !validateEmail(email)) {
      setFormErrors(prev => ({ ...prev, email: 'Please enter a valid email address.' }));
    } else {
      setFormErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);
    if (formErrors.phone && validatePhone(val)) {
      setFormErrors(prev => ({ ...prev, phone: undefined }));
    }
  };

  const handlePhoneBlur = () => {
    if (phone && !validatePhone(phone)) {
      setFormErrors(prev => ({ ...prev, phone: 'Please enter a valid 10-digit mobile number.' }));
    } else {
      setFormErrors(prev => ({ ...prev, phone: undefined }));
    }
  };

  // ─── Submission Handlers ───
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
    if (!validatePhone(phone)) {
      setFormErrors(prev => ({ ...prev, phone: 'Please enter a valid 10-digit mobile number.' }));
      return;
    }

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
    if (!validateEmail(email)) {
      setFormErrors(prev => ({ ...prev, email: 'Please enter a valid email address.' }));
      return;
    }

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

  // ─── Shared Input Style ───
  const inputCls = `w-full px-4 py-3 text-sm rounded-lg border transition-colors outline-none focus:ring-1`
    + ` text-[${C.navy}] placeholder-[#9ca3af]`
    + ` border-[${C.border}] focus:border-[${C.gold}] focus:ring-[${C.gold}]`;

  const labelCls = `block text-[10px] font-bold uppercase tracking-wider mb-2 text-[${C.navy}]`;

  return (
    <main className="flex-grow flex items-center justify-center py-16 md:py-24 px-4 min-h-[calc(100vh-80px)] font-body" style={{ backgroundColor: C.bg }}>
      <div className="w-full max-w-[480px]">
        <div className="rounded-[16px] shadow-sm border p-8 md:p-12 relative overflow-hidden" style={{ backgroundColor: C.card, borderColor: C.border }}>
          
          <Link to="/" className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors hover:opacity-70 mb-8" style={{ color: C.navy }}>
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            RETURN TO HOME
          </Link>
          
          <div className="text-center mb-8">
            <span className="block text-[10px] font-bold uppercase tracking-[0.3em] mb-3" style={{ color: C.goldDark }}>
              Welcome Back
            </span>
            <h1 className="font-serif text-4xl mb-3" style={{ color: C.navy }}>Sign In</h1>
            <p className="text-[13px] leading-relaxed" style={{ color: C.navyLight }}>
              Welcome back to Al Ahad Attars.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded border text-sm shadow-sm" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: C.error }}>
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <p>{error}</p>
            </div>
          )}

          {showPhoneModal ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-6 relative z-10">
              <p className="text-[13px] leading-relaxed" style={{ color: C.navyLight }}>
                Please enter your phone number to complete your Google registration.
              </p>
              <div>
                <label className={labelCls}>PHONE NUMBER <span style={{ color: C.error }}>*</span></label>
                <div className="flex">
                  <div className="flex items-center justify-center px-4 rounded-l-lg border-y border-l text-sm font-medium shrink-0 transition-colors" style={{ borderColor: formErrors.phone ? C.error : C.border, backgroundColor: 'white', color: C.navy }}>+91</div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={handlePhoneChange}
                    onBlur={handlePhoneBlur}
                    placeholder="98765 43210"
                    required
                    className={`${inputCls} rounded-l-none rounded-r-lg border-l-0`}
                    style={{ 
                      backgroundColor: C.inputBg,
                      borderColor: formErrors.phone ? C.error : C.border
                    }}
                  />
                </div>
                {formErrors.phone && (
                  <p className="text-[11px] mt-1.5" style={{ color: C.error }}>{formErrors.phone}</p>
                )}
              </div>
              <div className="pt-2 flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(false)}
                  className="flex-1 py-4 px-6 rounded-lg font-semibold text-[11px] uppercase tracking-wider transition-all border"
                  style={{ borderColor: C.border, color: C.navy }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 px-6 rounded-lg text-white font-semibold text-[11px] uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm"
                  style={{ background: `linear-gradient(to right, ${C.gold}, ${C.goldDark})` }}
                >
                  {isSubmitting ? 'SUBMITTING...' : 'COMPLETE'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex justify-center mb-6 relative z-10 bg-white">
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

              <div className="relative flex items-center py-6">
                <div className="flex-grow border-t" style={{ borderColor: C.border }}></div>
                <span className="flex-shrink-0 mx-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: C.navyLight }}>
                  OR SIGN IN WITH EMAIL
                </span>
                <div className="flex-grow border-t" style={{ borderColor: C.border }}></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                <div>
                  <label className={labelCls}>EMAIL ADDRESS <span style={{ color: C.error }}>*</span></label>
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    placeholder="name@example.com"
                    required
                    className={inputCls}
                    style={{ 
                      backgroundColor: C.inputBg,
                      borderColor: formErrors.email ? C.error : C.border 
                    }}
                  />
                  {formErrors.email && (
                    <p className="text-[11px] mt-1.5" style={{ color: C.error }}>{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className={`${labelCls} !mb-0`}>PASSWORD <span style={{ color: C.error }}>*</span></label>
                    <Link
                      to="/forgot-password"
                      className="text-[10px] font-bold uppercase tracking-wider hover:underline transition-colors"
                      style={{ color: C.goldDark }}
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={inputCls}
                    style={{ backgroundColor: C.inputBg }}
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-lg text-white font-semibold text-[13px] uppercase tracking-wider transition-all disabled:opacity-50 shadow-md hover:brightness-110 active:scale-[0.98]"
                    style={{ background: `linear-gradient(to right, ${C.gold}, ${C.goldDark})` }}
                  >
                    {isSubmitting ? 'SIGNING IN...' : 'SIGN IN'}
                    {!isSubmitting && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                  </button>
                </div>
              </form>

              <div className="mt-8 pt-6 text-center border-t relative z-10" style={{ borderColor: C.border }}>
                <p className="text-[13px] leading-relaxed" style={{ color: C.navyLight }}>
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    className="font-semibold transition-colors hover:underline"
                    style={{ color: C.navy }}
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
