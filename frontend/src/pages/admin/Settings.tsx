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
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await storeSettingsService.updateSettings({
        brandLogoUrl: settings?.brandLogoUrl || '', // Not updated here
        navbarLogoUrl: settings?.navbarLogoUrl || '', // Not updated here
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
        mapEmbedUrl
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
          <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-8 shadow-sm">
            <h3 className="font-headline-md text-xl mb-6 border-b border-outline-variant pb-4">General Configuration</h3>
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo Upload */}
                <div>
                  <label className="block font-label-sm uppercase text-on-surface-variant mb-2">Primary Brand Logo (Footer/About)</label>
                  <div className="flex flex-col gap-4">
                    <div 
                      className="w-32 h-32 border border-outline-variant bg-surface-container flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-primary transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {settings?.brandLogoUrl ? (
                        <img className="w-full h-full object-contain p-2 bg-white" src={getImageUrl(settings.brandLogoUrl)} alt="Brand Logo" />
                      ) : (
                        <span className="material-symbols-outlined text-outline text-3xl">image</span>
                      )}
                      <div className="absolute inset-0 bg-surface-tint/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="material-symbols-outlined text-white">edit</span>
                      </div>
                    </div>
                    <div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 border border-outline text-sm font-medium hover:border-primary hover:text-primary transition-colors mb-2">Change Primary Logo</button>
                    </div>
                  </div>
                </div>

                {/* Navbar Logo Upload */}
                <div>
                  <label className="block font-label-sm uppercase text-on-surface-variant mb-2">Navbar Logo (Clean Brand Mark)</label>
                  <div className="flex flex-col gap-4">
                    <div 
                      className="w-32 h-32 border border-outline-variant bg-surface-container flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-primary transition-colors"
                      onClick={() => navbarFileInputRef.current?.click()}
                    >
                      {settings?.navbarLogoUrl ? (
                        <img className="w-full h-full object-contain p-2 bg-white" src={getImageUrl(settings.navbarLogoUrl)} alt="Navbar Logo" />
                      ) : (
                        <span className="material-symbols-outlined text-outline text-3xl">image</span>
                      )}
                      <div className="absolute inset-0 bg-surface-tint/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="material-symbols-outlined text-white">edit</span>
                      </div>
                    </div>
                    <div>
                      <input type="file" ref={navbarFileInputRef} className="hidden" accept="image/*" onChange={handleNavbarLogoUpload} />
                      <button type="button" onClick={() => navbarFileInputRef.current?.click()} className="px-4 py-2 border border-outline text-sm font-medium hover:border-primary hover:text-primary transition-colors mb-2">Change Navbar Logo</button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-label-sm uppercase text-on-surface-variant mb-2">Store Name</label>
                  <input className="w-full bg-transparent border-0 border-b border-outline-variant p-0 pb-1 focus:ring-0 focus:border-primary font-body-md transition-colors" type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                </div>
                <div>
                  <label className="block font-label-sm uppercase text-on-surface-variant mb-2">WhatsApp Number</label>
                  <input className="w-full bg-transparent border-0 border-b border-outline-variant p-0 pb-1 focus:ring-0 focus:border-primary font-body-md transition-colors" type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+91 50 000 0000" />
                </div>
                <div>
                  <label className="block font-label-sm uppercase text-on-surface-variant mb-2">Instagram Handle</label>
                  <input className="w-full bg-transparent border-0 border-b border-outline-variant p-0 pb-1 focus:ring-0 focus:border-primary font-body-md transition-colors" type="text" value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} placeholder="@yourstore" />
                </div>
              </div>
            </div>
          </section>

          {/* Shipping Rates */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-8 shadow-sm">
            <h3 className="font-headline-md text-xl mb-6 border-b border-outline-variant pb-4">Shipping Rates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-label-sm uppercase text-on-surface-variant mb-2">Domestic Shipping Charge (INR)</label>
                <div className="relative">
                  <span className="absolute left-0 bottom-1 text-outline">?</span>
                  <input className="w-full bg-transparent border-0 border-b border-outline-variant pl-6 p-0 pb-1 focus:ring-0 focus:border-primary font-body-md transition-colors" type="number" value={shippingCharge} onChange={(e) => setShippingCharge(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="block font-label-sm uppercase text-on-surface-variant mb-2">Free Shipping Threshold</label>
                <div className="relative">
                  <span className="absolute left-0 bottom-1 text-outline">?</span>
                  <input className="w-full bg-transparent border-0 border-b border-outline-variant pl-6 p-0 pb-1 focus:ring-0 focus:border-primary font-body-md transition-colors" type="number" value={freeShippingThreshold} onChange={(e) => setFreeShippingThreshold(Number(e.target.value))} />
                </div>
              </div>
            </div>
          </section>

          {/* Legal Pages Text Areas */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-8 shadow-sm space-y-6">
            <h3 className="font-headline-md text-xl mb-2 border-b border-outline-variant pb-4">Legal Documents Content</h3>
            
            <div>
              <label className="block font-label-sm uppercase text-on-surface-variant mb-2">Privacy Policy</label>
              <textarea className="w-full bg-transparent border border-outline-variant rounded p-3 focus:ring-1 focus:ring-primary min-h-[150px]" value={privacyPolicy} onChange={(e) => setPrivacyPolicy(e.target.value)}></textarea>
            </div>
            
            <div>
              <label className="block font-label-sm uppercase text-on-surface-variant mb-2">Terms of Service</label>
              <textarea className="w-full bg-transparent border border-outline-variant rounded p-3 focus:ring-1 focus:ring-primary min-h-[150px]" value={termsOfService} onChange={(e) => setTermsOfService(e.target.value)}></textarea>
            </div>

            <div>
              <label className="block font-label-sm uppercase text-on-surface-variant mb-2">Return Policy</label>
              <textarea className="w-full bg-transparent border border-outline-variant rounded p-3 focus:ring-1 focus:ring-primary min-h-[150px]" value={returnPolicy} onChange={(e) => setReturnPolicy(e.target.value)}></textarea>
            </div>
          </section>

          {/* Contact Information */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-8 shadow-sm space-y-6">
            <h3 className="font-headline-md text-xl mb-2 border-b border-outline-variant pb-4">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-label-sm uppercase text-on-surface-variant mb-2">Phone Number</label>
                <input className="w-full bg-transparent border-0 border-b border-outline-variant p-0 pb-1 focus:ring-0 focus:border-primary font-body-md transition-colors" type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+91 123 456 7890" />
              </div>
              <div>
                <label className="block font-label-sm uppercase text-on-surface-variant mb-2">Email Address</label>
                <input className="w-full bg-transparent border-0 border-b border-outline-variant p-0 pb-1 focus:ring-0 focus:border-primary font-body-md transition-colors" type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="contact@example.com" />
              </div>
            </div>

            <div>
              <label className="block font-label-sm uppercase text-on-surface-variant mb-2">Business Address</label>
              <input className="w-full bg-transparent border-0 border-b border-outline-variant p-0 pb-1 focus:ring-0 focus:border-primary font-body-md transition-colors" type="text" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="123 Main Street" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block font-label-sm uppercase text-on-surface-variant mb-2">City</label>
                <input className="w-full bg-transparent border-0 border-b border-outline-variant p-0 pb-1 focus:ring-0 focus:border-primary font-body-md transition-colors" type="text" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <label className="block font-label-sm uppercase text-on-surface-variant mb-2">State</label>
                <input className="w-full bg-transparent border-0 border-b border-outline-variant p-0 pb-1 focus:ring-0 focus:border-primary font-body-md transition-colors" type="text" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div>
                <label className="block font-label-sm uppercase text-on-surface-variant mb-2">Country</label>
                <input className="w-full bg-transparent border-0 border-b border-outline-variant p-0 pb-1 focus:ring-0 focus:border-primary font-body-md transition-colors" type="text" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div>
                <label className="block font-label-sm uppercase text-on-surface-variant mb-2">Pincode</label>
                <input className="w-full bg-transparent border-0 border-b border-outline-variant p-0 pb-1 focus:ring-0 focus:border-primary font-body-md transition-colors" type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block font-label-sm uppercase text-on-surface-variant mb-2">Business Hours</label>
              <textarea className="w-full bg-transparent border border-outline-variant rounded p-3 focus:ring-1 focus:ring-primary min-h-[100px]" value={businessHours} onChange={(e) => setBusinessHours(e.target.value)} placeholder="Mon - Sat: 10:00 AM - 7:00 PM"></textarea>
            </div>

            <div>
              <label className="block font-label-sm uppercase text-on-surface-variant mb-2">Google Maps Embed URL</label>
              <textarea className="w-full bg-transparent border border-outline-variant rounded p-3 focus:ring-1 focus:ring-primary min-h-[100px]" value={mapEmbedUrl} onChange={(e) => setMapEmbedUrl(e.target.value)} placeholder="https://www.google.com/maps/embed?..."></textarea>
              <p className="text-sm text-on-surface-variant mt-1">Paste the full src URL from Google Maps embed code.</p>
            </div>
          </section>

        </div>

        {/* Right Column: Save Button (Sticky) */}
        <div className="space-y-6">
          <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 shadow-sm sticky top-32">
            <h3 className="font-headline-md text-lg mb-4">Actions</h3>
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full px-6 py-3 bg-primary text-on-primary font-medium hover:bg-surface-tint transition-colors shadow-sm text-sm uppercase tracking-wider rounded disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
            <button 
              onClick={() => refreshSettings()} 
              disabled={isSaving}
              className="w-full mt-4 px-6 py-3 border border-outline text-on-surface font-medium hover:border-primary hover:text-primary transition-colors text-sm uppercase tracking-wider rounded"
            >
              Discard Changes
            </button>
          </section>
        </div>
      </div>
    </>
  );
};
