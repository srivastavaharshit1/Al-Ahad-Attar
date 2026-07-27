import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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
    <main className="flex-grow flex items-center justify-center py-section-gap px-margin-mobile md:px-margin-desktop">
      <div className="bg-surface-container-lowest border border-outline-variant/30 shadow-[0_10px_30px_rgba(31,41,55,0.04)] rounded-lg w-full max-w-md p-10 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>
        
        <div className="text-center mb-8 relative z-10">
          <h1 className="font-headline-lg text-headline-lg text-on-background mb-2">Welcome Back</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Sign in to continue your olfactory journey.</p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="block font-label-sm text-label-sm text-on-background uppercase tracking-widest" htmlFor="email">Email Address</label>
            <div className="relative">
              <input 
                className="w-full bg-transparent border-0 border-b border-outline-variant py-2 focus:ring-0 focus:border-primary transition-colors duration-300 font-body-md text-body-md text-on-background placeholder:text-on-surface-variant/50" 
                id="email" 
                name="email" 
                placeholder="your@email.com" 
                required 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <label className="block font-label-sm text-label-sm text-on-background uppercase tracking-widest" htmlFor="password">Password</label>
              <button type="button" className="font-label-sm text-label-sm text-primary hover:text-primary-container transition-colors">Forgot Password?</button>
            </div>
            <div className="relative">
              <input 
                className="w-full bg-transparent border-0 border-b border-outline-variant py-2 focus:ring-0 focus:border-primary transition-colors duration-300 font-body-md text-body-md text-on-background placeholder:text-on-surface-variant/50" 
                id="password" 
                name="password" 
                placeholder="••••••••" 
                required 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <div className="pt-4">
            <button 
              className="w-full bg-primary text-on-primary py-3 px-6 font-label-md text-label-md hover:bg-primary-container transition-colors duration-300 flex justify-center items-center gap-2 disabled:opacity-50" 
              type="submit"
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
              {!isSubmitting && <span className="material-symbols-outlined text-[18px]" data-icon="arrow_forward">arrow_forward</span>}
            </button>
          </div>
        </form>
        
        <div className="mt-8 text-center relative z-10">
          <p className="font-body-md text-body-md text-on-surface-variant">
            Don't have an account? 
            <Link to="/register" className="text-primary hover:text-primary-container font-label-md text-label-md underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-colors ml-1">Register</Link>
          </p>
        </div>
      </div>
    </main>
  );
};
