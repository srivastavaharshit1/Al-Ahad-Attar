import React, { useState, useEffect, useRef } from 'react';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { storeSettingsService } from '../../services/storeSettingsService';
import { getImageUrl } from '../../utils/getImageUrl';
import toast from 'react-hot-toast';

export const Settings: React.FC = () => {
  const { settings, refreshSettings } = useStoreSettings();
  
  const [storeName, setStoreName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [shippingCharge, setShippingCharge] = useState<number>(0);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(0);
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [termsOfService, setTermsOfService] = useState('');
  const [returnPolicy, setReturnPolicy] = useState('');
  
  // Announcement Bar
  const [isAnnouncementBarActive, setIsAnnouncementBarActive] = useState(true);
  const [customAnnouncementText, setCustomAnnouncementText] = useState('');
  
  // New Contact Fields
  const [businessAddress, setBusinessAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [pincode, setPincode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [mapEmbedUrl, setMapEmbedUrl] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navbarFileInputRef = useRef<HTMLInputElement>(null);
  
  // Local state for logos to allow removal before save
  const [localBrandLogo, setLocalBrandLogo] = useState<string | null>(null);
  const [localNavbarLogo, setLocalNavbarLogo] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setStoreName(settings.storeName || '');
      setWhatsappNumber(settings.whatsappNumber || '');
      setInstagramHandle(settings.instagramHandle || '');
      setShippingCharge(settings.shippingCharge || 0);
      setFreeShippingThreshold(settings.freeShippingThreshold || 0);
      setPrivacyPolicy(settings.privacyPolicy || '');
      setTermsOfService(settings.termsOfService || '');
      setReturnPolicy(settings.returnPolicy || '');
      
      setBusinessAddress(settings.businessAddress || '');
      setCity(settings.city || '');
      setState(settings.state || '');
      setCountry(settings.country || '');
      setPincode(settings.pincode || '');
      setPhoneNumber(settings.phoneNumber || '');
      setEmailAddress(settings.emailAddress || '');
      setBusinessHours(settings.businessHours || '');
      setMapEmbedUrl(settings.mapEmbedUrl || '');
      
      setIsAnnouncementBarActive(settings.isAnnouncementBarActive ?? true);
      setCustomAnnouncementText(settings.customAnnouncementText || '');
      
      setLocalBrandLogo(settings.brandLogoUrl || null);
      setLocalNavbarLogo(settings.navbarLogoUrl || null);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await storeSettingsService.updateSettings({
        brandLogoUrl: localBrandLogo || '',
        navbarLogoUrl: localNavbarLogo || '',
        storeName,
        whatsappNumber,
        instagramHandle,
        shippingCharge,
        freeShippingThreshold,
        privacyPolicy,
        termsOfService,
        returnPolicy,
        businessAddress,
        city,
        state,
        country,
        pincode,
        phoneNumber,
        emailAddress,
        businessHours,
        mapEmbedUrl,
        isAnnouncementBarActive,
        customAnnouncementText
      });
      await refreshSettings();
      toast.success('Settings updated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        e.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Logo image must be smaller than 5MB');
        e.target.value = '';
        return;
      }
      try {
        toast.loading('Uploading logo...', { id: 'upload' });
        await storeSettingsService.uploadLogo(file);
        await refreshSettings();
        toast.success('Logo uploaded successfully!', { id: 'upload' });
      } catch (error) {
        console.error(error);
        toast.error('Failed to upload logo.', { id: 'upload' });
      }
    }
  };

  const handleNavbarLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        e.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Logo image must be smaller than 5MB');
        e.target.value = '';
        return;
      }
      try {
        toast.loading('Uploading navbar logo...', { id: 'uploadNavbar' });
        await storeSettingsService.uploadNavbarLogo(file);
        await refreshSettings();
        toast.success('Navbar Logo uploaded successfully!', { id: 'uploadNavbar' });
      } catch (error) {
        console.error(error);
        toast.error('Failed to upload navbar logo.', { id: 'uploadNavbar' });
      }
    }
  };

  return (
    <>
      <div className="mb-10">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Store Configuration</h2>
        <p className="text-on-surface-variant mt-2">Manage global settings, shipping rates, and legal pages.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-16">
        {/* Left Column: Forms */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* General Configuration */}
          <section className="card p-8">
            <h3 className="font-headline-md text-xl mb-6 border-b border-outline-variant pb-4">General Configuration</h3>
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo Upload */}
                <div>
                  <div className="flex flex-col mb-4">
                    <label className="field-label mb-0">Primary Store Logo (Footer/About)</label>
                    <span className="text-[10px] text-accent/90 mt-1 font-medium">Recommended: 200x50 (4:1 ratio for Wide) or 100x100 (1:1 ratio for Square)</span>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div 
                      className="w-32 h-32 border border-outline-variant bg-surface-container flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-primary transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {localBrandLogo ? (
                        <img className="w-full h-full object-contain p-2 bg-white" src={getImageUrl(localBrandLogo)} alt="Brand Logo" />
                      ) : (
                        <span className="material-symbols-outlined text-outline text-3xl">image</span>
                      )}
                      <div className="absolute inset-0 bg-surface-tint/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="material-symbols-outlined text-white">edit</span>
                      </div>
                    </div>
                    <div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-outline px-4 py-2 rounded-lg text-sm font-label-md mb-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">Change Logo</button>
                        {localBrandLogo && (
                          <button type="button" onClick={() => setLocalBrandLogo(null)} className="btn-outline px-4 py-2 rounded-lg text-sm font-label-md mb-2 border-red-500 text-red-500 hover:bg-red-50">Remove</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navbar Logo Upload */}
                <div>
                  <div className="flex flex-col mb-4">
                    <label className="field-label mb-0">Navbar Logo (Clean Brand Mark)</label>
                    <span className="text-[10px] text-accent/90 mt-1 font-medium">Recommended: 200x50 (4:1 ratio for Wide) or 100x100 (1:1 ratio for Square)</span>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div 
                      className="w-32 h-32 border border-outline-variant bg-surface-container flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-primary transition-colors"
                      onClick={() => navbarFileInputRef.current?.click()}
                    >
                      {localNavbarLogo ? (
                        <img className="w-full h-full object-contain p-2 bg-white" src={getImageUrl(localNavbarLogo)} alt="Navbar Logo" />
                      ) : (
                        <span className="material-symbols-outlined text-outline text-3xl">image</span>
                      )}
                      <div className="absolute inset-0 bg-surface-tint/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="material-symbols-outlined text-white">edit</span>
                      </div>
                    </div>
                    <div>
                      <input type="file" ref={navbarFileInputRef} className="hidden" accept="image/*" onChange={handleNavbarLogoUpload} />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => navbarFileInputRef.current?.click()} className="btn-outline px-4 py-2 rounded-lg text-sm font-label-md mb-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">Change Logo</button>
                        {localNavbarLogo && (
                          <button type="button" onClick={() => setLocalNavbarLogo(null)} className="btn-outline px-4 py-2 rounded-lg text-sm font-label-md mb-2 border-red-500 text-red-500 hover:bg-red-50">Remove</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="field-label">Store Name</label>
                  <input className="field-input" type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">WhatsApp Number</label>
                  <input className="field-input" type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+91 50 000 0000" />
                </div>
                <div>
                  <label className="field-label">Instagram Handle</label>
                  <input className="field-input" type="text" value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} placeholder="@yourstore" />
                </div>
              </div>
            </div>
          </section>

          {/* Announcement Bar */}
          <section className="card p-8">
            <h3 className="font-headline-md text-xl mb-6 border-b border-outline-variant pb-4">Announcement Bar</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isAnnouncementBarActive"
                  checked={isAnnouncementBarActive}
                  onChange={(e) => setIsAnnouncementBarActive(e.target.checked)}
                  className="w-4 h-4 text-primary bg-surface border-outline rounded focus:ring-primary focus:ring-2"
                />
                <label htmlFor="isAnnouncementBarActive" className="text-on-surface font-label-lg cursor-pointer">
                  Enable Announcement Bar
                </label>
              </div>
              <p className="text-sm text-on-surface-variant">
                If disabled, the top announcement bar will be completely hidden regardless of active promotions or custom text.
              </p>

              <div>
                <label className="field-label">Custom Announcement Text</label>
                <input
                  className="field-input"
                  type="text"
                  value={customAnnouncementText}
                  onChange={(e) => setCustomAnnouncementText(e.target.value)}
                  placeholder="e.g. Special Holiday Sale! 20% Off Everything"
                  disabled={!isAnnouncementBarActive}
                />
                <p className="text-[12px] text-on-surface-variant mt-2">
                  Leave this blank to automatically show your active promotions on rotation. If you enter text here, it will override the promotions and show this exact message instead.
                </p>
              </div>
            </div>
          </section>

          {/* Shipping Rates */}
          <section className="card p-8">
            <h3 className="font-headline-md text-xl mb-6 border-b border-outline-variant pb-4">Shipping Rates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="field-label">Domestic Shipping Charge (INR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">₹</span>
                  <input className="field-input pl-8" type="number" value={shippingCharge} onChange={(e) => setShippingCharge(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="field-label">Free Shipping Threshold</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">₹</span>
                  <input className="field-input pl-8" type="number" value={freeShippingThreshold} onChange={(e) => setFreeShippingThreshold(Number(e.target.value))} />
                </div>
              </div>
            </div>
          </section>

          {/* Legal Pages Text Areas */}
          <section className="card p-8 space-y-6">
            <h3 className="font-headline-md text-xl mb-2 border-b border-outline-variant pb-4">Legal Documents Content</h3>
            
            <div>
              <label className="field-label">Privacy Policy</label>
              <textarea className="field-input min-h-[150px] resize-y" value={privacyPolicy} onChange={(e) => setPrivacyPolicy(e.target.value)}></textarea>
            </div>
            
            <div>
              <label className="field-label">Terms of Service</label>
              <textarea className="field-input min-h-[150px] resize-y" value={termsOfService} onChange={(e) => setTermsOfService(e.target.value)}></textarea>
            </div>

            <div>
              <label className="field-label">Return Policy</label>
              <textarea className="field-input min-h-[150px] resize-y" value={returnPolicy} onChange={(e) => setReturnPolicy(e.target.value)}></textarea>
            </div>
          </section>

          {/* Contact Information */}
          <section className="card p-8 space-y-6">
            <h3 className="font-headline-md text-xl mb-2 border-b border-outline-variant pb-4">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="field-label">Phone Number</label>
                <input className="field-input" type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+91 123 456 7890" />
              </div>
              <div>
                <label className="field-label">Email Address</label>
                <input className="field-input" type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="contact@example.com" />
              </div>
            </div>

            <div>
              <label className="field-label">Business Address</label>
              <input className="field-input" type="text" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="123 Main Street" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="field-label">City</label>
                <input className="field-input" type="text" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <label className="field-label">State</label>
                <input className="field-input" type="text" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Country</label>
                <input className="field-input" type="text" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Pincode</label>
                <input className="field-input" type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="field-label">Business Hours</label>
              <textarea className="field-input min-h-[100px] resize-y" value={businessHours} onChange={(e) => setBusinessHours(e.target.value)} placeholder="Mon - Sat: 10:00 AM - 7:00 PM"></textarea>
            </div>

            <div>
              <label className="field-label">Google Maps Embed URL</label>
              <textarea className="field-input min-h-[100px] resize-y" value={mapEmbedUrl} onChange={(e) => setMapEmbedUrl(e.target.value)} placeholder="https://www.google.com/maps/embed?..."></textarea>
              <p className="text-sm text-on-surface-variant mt-1">Paste the full src URL from Google Maps embed code.</p>
            </div>
          </section>

        </div>

        {/* Right Column: Save Button (Sticky) */}
        <div className="space-y-6">
          <section className="card p-6 sticky top-32">
            <h3 className="font-headline-md text-lg mb-4">Actions</h3>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn btn-gold w-full disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
            <button
              onClick={() => refreshSettings()}
              disabled={isSaving}
              className="btn btn-outline w-full mt-4"
            >
              Discard Changes
            </button>
          </section>
        </div>
      </div>
    </>
  );
};
