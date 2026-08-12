import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/account/dashboard';

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
        </div>
      </div>
    </main>
  );
};
