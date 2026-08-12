import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { PhoneInput } from '../components/ui/PhoneInput';

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
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
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
    <main className="flex-grow flex w-full bg-background">
      <div className="hidden lg:block lg:w-1/2 relative bg-surface-variant">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDXj3eSqQ4kgRkbi2POUsoT6GPOSdw_npgvprAoh_lWPx4ZShg17Qfwgo_QaGvqqNo9YzqhvDuqYWI2lvIviVyEpcl4H5gDfU3DpF0GHC7Gd54gfSl1YhGNuCYYpQh-9Jfmy-FgJKJ42ZKpHscsGdm4JjeVFGhUNejdadxlOgiqaeONeiGx9JqvZTQQDV2UKkwf7HXMTfcn2yG6Yj5PSRlaYj2fdnO9xVijk2qM8GPomzG_73QWDhd4pe9njozkf8b5ei9mdTFV5Q')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-ink/60"></div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-margin-mobile py-16 md:py-24 lg:px-16 relative z-10">
        <div className="w-full max-w-[480px] card p-8 md:p-12">
          <div className="text-center mb-8">
            <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] mb-3 block">Join Us</span>
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Create Account</h1>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">Begin your exclusive olfactory journey.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-md text-sm" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                id="firstName"
                name="firstName"
                placeholder="First"
                required
                type="text"
                value={formData.firstName}
                onChange={handleChange}
              />
              <Input
                label="Last Name"
                id="lastName"
                name="lastName"
                placeholder="Last"
                required
                type="text"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>

            <Input
              label="Email Address"
              id="email"
              name="email"
              placeholder="Enter your email"
              required
              type="email"
              value={formData.email}
              onChange={handleChange}
            />

            <PhoneInput
              label="Phone Number"
              id="phone"
              required
              value={formData.phone}
              onChange={(phone) => setFormData({ ...formData, phone })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Password"
                id="password"
                name="password"
                placeholder="••••••••"
                required
                type="password"
                value={formData.password}
                onChange={handleChange}
              />
              <Input
                label="Confirm"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="••••••••"
                required
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>

            <div className="flex items-start gap-3 mt-1">
              <div className="pt-1">
                <input
                  className="w-5 h-5 rounded-sm border-outline-variant text-accent focus:ring-0 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 bg-transparent cursor-pointer transition-shadow"
                  id="newsletter"
                  name="newsletter"
                  type="checkbox"
                />
              </div>
              <label className="font-body-md text-body-md text-on-surface-variant cursor-pointer select-none leading-relaxed" htmlFor="newsletter">
                Join our exclusive olfactory journey to receive updates on new attars and private collections.
              </label>
            </div>

            <button
              className="btn btn-primary w-full mt-2 disabled:opacity-45"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Already have an account?{' '}
              <Link
                to="/login"
                className="link-underline font-medium text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-sm"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};
