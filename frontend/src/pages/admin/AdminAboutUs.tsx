import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import toast from 'react-hot-toast';

/* ─── Default content mirrors About.tsx defaults exactly ─────── */
const DEFAULT_CONTENT = {
  hero: {
    eyebrow: 'OUR PHILOSOPHY',
    title: 'Your Fragrance is Your Signature',
    description:
      'At Al Ahad Attars, we believe that scent is more than an accessory—it is an identity, an emotion, and a lasting impression. Guided by our philosophy, "Your Fragrance is Your Signature," we curate exquisite, alcohol-free artisanal attars and pure perfume oils designed to leave an unforgettable presence wherever you go.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDhki3C6gDAjRNyDBV8U_XwUQ2ImFWQtx2MDVAV6-txhuaUJJusdbUKfIx4WqlqYFHUVOvPX_RewEzDEdfGBHF0Qd3ZR8nZvMPR2pMnxPXwUpfZ7QfPBArUJstd22K36Xh8-mx5KR9GiD5_JOIj46R5qaVqZ6WtF8u_OEvAqJcM1IpCy_2fsszkAgP65FGbLlVv1wxNFh_Vv5b8K_KoZ2szdmJtOCI4ommDZunH61nESrJ-BmwYnKHfQu0fqdHngk12xhYSf4_wXg',
  },
  craft: {
    eyebrow: 'OUR CRAFT & HERITAGE',
    title: 'Rooted in Tradition, Crafted for Today',
    description:
      'Rooted in the timeless traditions of Eastern perfumery, our journey began with a passion for authenticity and refined taste. We source premium natural essences—from deep, smoky aged oud and rare agarwood to royal saffron, warm amber, and delicate floral extracts. Every blend is crafted with precision, balancing heritage distillation techniques with modern sophistication to create long-lasting, skin-safe fragrances that evolve beautifully throughout the day.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCpfyKq-fTIeobDe10wnwUKsCdFkuDC0sCEgReGlXb3uCiLwnlrQmUwHNkdvnTeWr-GpKUV2NTazq_bBnA0mbopwqBESctUoLgcp4UNQJj214y1fnaT3mWnrc4D5FC-aeN3008Myp9DPZtLbmn69XxI10aQBOkn5Ls9H9GFWMWuWS0v2wRcGDLRZiFsaImWqOpZ839tUgFz5ON5WtKpWhPJZYrjqLyXjG0jrMJE2thBcciaj6dO7qzPrJvSXp3XrbhlsIUKg2dlXw',
  },
  whyChoose: {
    feature1Title: '100% Alcohol-Free Purity',
    feature1Desc:
      'Concentrated perfume oils formulated for superior longevity, rich projection, and gentle application on skin.',
    feature2Title: 'Masterful Blends',
    feature2Desc:
      'Thoughtfully balanced notes ranging from dark, magnetic ouds and warm musks to crisp florals and modern Middle Eastern blends.',
    feature3Title: 'Uncompromising Quality',
    feature3Desc:
      'Sourced from ethical distillers and bottled with meticulous attention to presentation and elegance.',
  },
  signature: {
    eyebrow: 'FIND YOUR SIGNATURE',
    title: 'A Fragrance That Tells Your Story',
    description:
      'Whether you are seeking a distinguished oud for special occasions, a soothing daily wear, or an evocative fragrance that speaks of understated luxury, Al Ahad Attars offers an olfactory experience crafted just for you. Discover a scent that tells your story—because your fragrance is truly your signature.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBn1kiFiE9F4b9hfkotXX0gtBtfkxaoqIm3u9f3mIzjHJDAic9Vzthv3R1N-5fwis6V1yDZHyW41nxoExNJAs5F45e8dyhqyK3ZrJ77w2Imc07cML4XX-Q3bfxRJjSDd34LsigxeKQ3vNYtNkMyEMkQUQN3zbHCJO94c6lydw3KbT-UuDJRaSaTrH66Q82srdeO8jwIOVk-ucGL2b1RgeYxrAXiuF-PT9PkM0usauRBb3Y0mxyHoqSilzSVN-2H9VHSv1dYCNm-1A',
    ctaText: 'DISCOVER OUR COLLECTION',
    ctaLink: '/collection',
  },
  cta: {
    eyebrow: 'THE AL AHAD EXPERIENCE',
    title: 'Find Your Signature',
    description:
      'Explore our collection of artisanal attars and pure perfume oils, crafted for those who appreciate authentic fragrance, refined craftsmanship, and understated luxury.',
    button1Text: 'EXPLORE COLLECTIONS',
    button1Link: '/collection',
    button2Text: 'CONTACT US',
    button2Link: '/contact',
  },
};

type ContentType = typeof DEFAULT_CONTENT;

/* ─── Shared form field components ────────────────────────── */
const FormField: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {hint && <span className="text-gray-400 text-xs ml-2 font-normal">{hint}</span>}
    </label>
    {children}
  </div>
);

/* ─── Image upload field ───────────────────────────────────── */
interface ImageUploadProps {
  imageUrl: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
  hint?: string;
}
const ImageUpload: React.FC<ImageUploadProps> = ({ imageUrl, onUpload, onRemove, hint }) => (
  <FormField label="Image" hint={hint}>
    {imageUrl && (
      <div className="relative inline-block mb-2 w-full">
        <img src={imageUrl} alt="Preview" className="w-full h-40 object-cover rounded-md border border-gray-200" />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 focus:outline-none"
          title="Remove image"
        >
          <span className="material-symbols-outlined text-[14px]">close</span>
        </button>
      </div>
    )}
    <input
      type="file"
      accept="image/*"
      className="file-input file-input-bordered w-full"
      onChange={(e) => {
        if (e.target.files && e.target.files[0]) onUpload(e.target.files[0]);
      }}
    />
  </FormField>
);

/* ═══════════════════════════════════════════════════════════════
   ADMIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export const AdminAboutUs: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<ContentType>(DEFAULT_CONTENT);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await cmsService.getAdminPage('about');
        if (response.data.contentJson) {
          const data = JSON.parse(response.data.contentJson);
          setContent(prev => ({ ...prev, ...data }));
        }
      } catch (err: any) {
        if (err.response?.status !== 404) {
          toast.error('Failed to load About Us content');
        }
      }
    };
    fetchContent();
  }, []);

  /* Generic nested field updater */
  const handleChange = <S extends keyof ContentType>(section: S, field: keyof ContentType[S], value: string) => {
    setContent(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  /* Image upload helper */
  const handleImageUpload = async <S extends keyof ContentType>(section: S, field: keyof ContentType[S], file: File) => {
    const toastId = toast.loading('Uploading image...');
    try {
      const url = await cmsService.uploadImage(file);
      handleChange(section, field, url);
      toast.success('Image uploaded successfully', { id: toastId });
    } catch {
      toast.error('Failed to upload image', { id: toastId });
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      await cmsService.updatePage('about', JSON.stringify(content));
      toast.success('About Us page updated successfully');
    } catch {
      toast.error('Failed to update About Us page');
    } finally {
      setLoading(false);
    }
  };

  const SaveButton = () => (
    <button
      type="button"
      onClick={() => handleSubmit()}
      disabled={loading}
      className="btn btn-primary"
    >
      {loading ? 'Saving...' : 'Save Changes'}
    </button>
  );

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">About Us Page Content</h1>
          <p className="text-sm text-gray-500 mt-1">Edit the content displayed on the public About Us page.</p>
        </div>
        <SaveButton />
      </div>

      <div className="space-y-8">
        {/* ── 1. HERO SECTION ─────────────────────────────── */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Hero Section</h2>
          <p className="text-xs text-gray-400 mb-5">Cinematic full-viewport banner — first thing visitors see.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Eyebrow Text" hint="Displayed in small gold caps above the heading">
              <input
                type="text"
                className="input input-bordered w-full"
                value={content.hero.eyebrow}
                onChange={(e) => handleChange('hero', 'eyebrow', e.target.value)}
              />
            </FormField>
            <FormField label="Heading (H1)">
              <input
                type="text"
                className="input input-bordered w-full"
                value={content.hero.title}
                onChange={(e) => handleChange('hero', 'title', e.target.value)}
              />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Description">
                <textarea
                  className="textarea textarea-bordered w-full h-28"
                  value={content.hero.description}
                  onChange={(e) => handleChange('hero', 'description', e.target.value)}
                />
              </FormField>
            </div>
            <div className="md:col-span-2">
              <ImageUpload
                imageUrl={content.hero.image}
                onUpload={(f) => handleImageUpload('hero', 'image', f)}
                onRemove={() => handleChange('hero', 'image', '')}
                hint="Recommended: 16:9 high resolution, cinematic"
              />
            </div>
          </div>
        </div>

        {/* ── 2. CRAFT & HERITAGE SECTION ─────────────────── */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Craft & Heritage Section</h2>
          <p className="text-xs text-gray-400 mb-5">Split layout — text left, editorial portrait image right.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Eyebrow Text">
              <input
                type="text"
                className="input input-bordered w-full"
                value={content.craft.eyebrow}
                onChange={(e) => handleChange('craft', 'eyebrow', e.target.value)}
              />
            </FormField>
            <FormField label="Heading">
              <input
                type="text"
                className="input input-bordered w-full"
                value={content.craft.title}
                onChange={(e) => handleChange('craft', 'title', e.target.value)}
              />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Description">
                <textarea
                  className="textarea textarea-bordered w-full h-28"
                  value={content.craft.description}
                  onChange={(e) => handleChange('craft', 'description', e.target.value)}
                />
              </FormField>
            </div>
            <div className="md:col-span-2">
              <ImageUpload
                imageUrl={content.craft.image}
                onUpload={(f) => handleImageUpload('craft', 'image', f)}
                onRemove={() => handleChange('craft', 'image', '')}
                hint="Recommended: 4:5 portrait — oud, saffron, or artisan craftsmanship"
              />
            </div>
          </div>
        </div>

        {/* ── 3. WHY CHOOSE SECTION ───────────────────────── */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Why Choose Al Ahad Attars</h2>
          <p className="text-xs text-gray-400 mb-5">Three editorial feature blocks with gold accents.</p>
          <div className="space-y-6">
            {/* Feature 1 */}
            <div className="border border-gray-100 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Feature 1</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Title">
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={content.whyChoose.feature1Title}
                    onChange={(e) => handleChange('whyChoose', 'feature1Title', e.target.value)}
                  />
                </FormField>
                <FormField label="Description">
                  <textarea
                    className="textarea textarea-bordered w-full h-20"
                    value={content.whyChoose.feature1Desc}
                    onChange={(e) => handleChange('whyChoose', 'feature1Desc', e.target.value)}
                  />
                </FormField>
              </div>
            </div>
            {/* Feature 2 */}
            <div className="border border-gray-100 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Feature 2</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Title">
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={content.whyChoose.feature2Title}
                    onChange={(e) => handleChange('whyChoose', 'feature2Title', e.target.value)}
                  />
                </FormField>
                <FormField label="Description">
                  <textarea
                    className="textarea textarea-bordered w-full h-20"
                    value={content.whyChoose.feature2Desc}
                    onChange={(e) => handleChange('whyChoose', 'feature2Desc', e.target.value)}
                  />
                </FormField>
              </div>
            </div>
            {/* Feature 3 */}
            <div className="border border-gray-100 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Feature 3</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Title">
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={content.whyChoose.feature3Title}
                    onChange={(e) => handleChange('whyChoose', 'feature3Title', e.target.value)}
                  />
                </FormField>
                <FormField label="Description">
                  <textarea
                    className="textarea textarea-bordered w-full h-20"
                    value={content.whyChoose.feature3Desc}
                    onChange={(e) => handleChange('whyChoose', 'feature3Desc', e.target.value)}
                  />
                </FormField>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. FIND YOUR SIGNATURE SECTION ─────────────── */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Find Your Signature Section</h2>
          <p className="text-xs text-gray-400 mb-5">Immersive section with atmospheric full-bleed background image.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Eyebrow Text">
              <input
                type="text"
                className="input input-bordered w-full"
                value={content.signature.eyebrow}
                onChange={(e) => handleChange('signature', 'eyebrow', e.target.value)}
              />
            </FormField>
            <FormField label="Heading">
              <input
                type="text"
                className="input input-bordered w-full"
                value={content.signature.title}
                onChange={(e) => handleChange('signature', 'title', e.target.value)}
              />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Description">
                <textarea
                  className="textarea textarea-bordered w-full h-28"
                  value={content.signature.description}
                  onChange={(e) => handleChange('signature', 'description', e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="CTA Button Text">
              <input
                type="text"
                className="input input-bordered w-full"
                value={content.signature.ctaText}
                onChange={(e) => handleChange('signature', 'ctaText', e.target.value)}
              />
            </FormField>
            <FormField label="CTA Button Link">
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="/collection"
                value={content.signature.ctaLink}
                onChange={(e) => handleChange('signature', 'ctaLink', e.target.value)}
              />
            </FormField>
            <div className="md:col-span-2">
              <ImageUpload
                imageUrl={content.signature.image}
                onUpload={(f) => handleImageUpload('signature', 'image', f)}
                onRemove={() => handleChange('signature', 'image', '')}
                hint="Recommended: 16:9 atmospheric — perfume bottles, marble, twilight mood"
              />
            </div>
          </div>
        </div>

        {/* ── 5. FINAL CTA SECTION ────────────────────────── */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Final CTA Section</h2>
          <p className="text-xs text-gray-400 mb-5">Closing call-to-action on ivory background with two buttons.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Eyebrow Text">
              <input
                type="text"
                className="input input-bordered w-full"
                value={content.cta.eyebrow}
                onChange={(e) => handleChange('cta', 'eyebrow', e.target.value)}
              />
            </FormField>
            <FormField label="Heading">
              <input
                type="text"
                className="input input-bordered w-full"
                value={content.cta.title}
                onChange={(e) => handleChange('cta', 'title', e.target.value)}
              />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Description">
                <textarea
                  className="textarea textarea-bordered w-full h-20"
                  value={content.cta.description}
                  onChange={(e) => handleChange('cta', 'description', e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Primary Button Text" hint="Gold button — collection link">
              <input
                type="text"
                className="input input-bordered w-full"
                value={content.cta.button1Text}
                onChange={(e) => handleChange('cta', 'button1Text', e.target.value)}
              />
            </FormField>
            <FormField label="Primary Button Link">
              <input
                type="text"
                className="input input-bordered w-full"
                value={content.cta.button1Link}
                onChange={(e) => handleChange('cta', 'button1Link', e.target.value)}
              />
            </FormField>
            <FormField label="Secondary Button Text" hint="Outline button — contact link">
              <input
                type="text"
                className="input input-bordered w-full"
                value={content.cta.button2Text}
                onChange={(e) => handleChange('cta', 'button2Text', e.target.value)}
              />
            </FormField>
            <FormField label="Secondary Button Link">
              <input
                type="text"
                className="input input-bordered w-full"
                value={content.cta.button2Link}
                onChange={(e) => handleChange('cta', 'button2Link', e.target.value)}
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* Bottom save */}
      <div className="mt-8 flex justify-end">
        <SaveButton />
      </div>
    </div>
  );
};
