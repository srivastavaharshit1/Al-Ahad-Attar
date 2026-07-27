import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Backend expects firstName and lastName
      let firstName = formData.firstName;
      let lastName = formData.lastName;
      
      // If we only collected fullName, split it. But we actually collected them separately or not?
      // Wait, the UI only has "fullName". Let's split it.
      if ((formData as any).fullName) {
        const parts = (formData as any).fullName.trim().split(' ');
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      }

      await register({
        firstName,
        lastName,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        phone: formData.phone
      });
      navigate('/account/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-grow flex w-full">
      <div className="hidden lg:block lg:w-1/2 relative bg-surface-variant">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat" 
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDXj3eSqQ4kgRkbi2POUsoT6GPOSdw_npgvprAoh_lWPx4ZShg17Qfwgo_QaGvqqNo9YzqhvDuqYWI2lvIviVyEpcl4H5gDfU3DpF0GHC7Gd54gfSl1YhGNuCYYpQh-9Jfmy-FgJKJ42ZKpHscsGdm4JjeVFGhUNejdadxlOgiqaeONeiGx9JqvZTQQDV2UKkwf7HXMTfcn2yG6Yj5PSRlaYj2fdnO9xVijk2qM8GPomzG_73QWDhd4pe9njozkf8b5ei9mdTFV5Q')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface-container-low/90"></div>
      </div>
      
      <div className="w-full lg:w-1/2 flex items-center justify-center px-margin-mobile py-section-gap lg:px-24 relative z-10">
        <div className="w-full max-w-md bg-surface-container-lowest p-8 md:p-12 border border-outline-variant/30 shadow-[0_10px_30px_rgba(31,41,55,0.04)] rounded-DEFAULT">
          <div className="text-center mb-10">
            <h1 className="font-headline-lg text-headline-lg text-primary mb-2 tracking-tight">Create Account</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Begin your exclusive olfactory journey.</p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="firstName">First Name</label>
                <input 
                  className="border-0 border-b border-outline-variant bg-transparent py-3 px-0 focus:outline-none focus:ring-0 focus:border-primary font-body-md text-on-surface w-full transition-colors" 
                  id="firstName" 
                  name="firstName" 
                  placeholder="First" 
                  required 
                  type="text" 
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="lastName">Last Name</label>
                <input 
                  className="border-0 border-b border-outline-variant bg-transparent py-3 px-0 focus:outline-none focus:ring-0 focus:border-primary font-body-md text-on-surface w-full transition-colors" 
                  id="lastName" 
                  name="lastName" 
                  placeholder="Last" 
                  required 
                  type="text" 
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="email">Email Address</label>
              <input 
                className="border-0 border-b border-outline-variant bg-transparent py-3 px-0 focus:outline-none focus:ring-0 focus:border-primary font-body-md text-on-surface w-full transition-colors" 
                id="email" 
                name="email" 
                placeholder="Enter your email" 
                required 
                type="email" 
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="phone">Phone Number</label>
              <input 
                className="w-full bg-transparent border-0 border-b border-outline-variant py-2 focus:ring-0 focus:border-primary transition-colors duration-300 font-body-md text-body-md text-on-background placeholder:text-on-surface-variant/50" 
                id="phone" 
                name="phone" 
                placeholder="+919876543210" 
                type="tel" 
                required
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="password">Password</label>
                <input 
                  className="border-0 border-b border-outline-variant bg-transparent py-3 px-0 focus:outline-none focus:ring-0 focus:border-primary font-body-md text-on-surface w-full transition-colors" 
                  id="password" 
                  name="password" 
                  placeholder="••••••••" 
                  required 
                  type="password" 
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="confirmPassword">Confirm</label>
                <input 
                  className="border-0 border-b border-outline-variant bg-transparent py-3 px-0 focus:outline-none focus:ring-0 focus:border-primary font-body-md text-on-surface w-full transition-colors" 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  placeholder="••••••••" 
                  required 
                  type="password" 
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="flex items-start gap-3 mt-2">
              <div className="pt-1">
                <input className="w-5 h-5 rounded-sm border-outline-variant text-primary focus:ring-primary bg-transparent cursor-pointer" id="newsletter" name="newsletter" type="checkbox" />
              </div>
              <label className="font-body-md text-body-md text-on-surface-variant cursor-pointer select-none" htmlFor="newsletter">
                Join our exclusive olfactory journey to receive updates on new attars and private collections.
              </label>
            </div>
            
            <button 
              className="w-full bg-primary text-on-primary font-label-md text-label-md py-4 mt-4 tracking-wider uppercase hover:bg-tertiary transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-container-lowest disabled:opacity-50" 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Already have an account? 
              <Link to="/login" className="text-primary hover:text-tertiary transition-colors border-b border-primary/30 hover:border-primary pb-0.5 ml-1">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};
