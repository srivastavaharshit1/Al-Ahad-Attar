import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import toast from 'react-hot-toast';

export const AdminAboutUs: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState({
    hero: {
      title: 'The Alchemy of Stillness',
      subtitle: 'Our Philosophy',
      description: 'Where centuries of traditional Arabic perfumery converge with the quiet restraint of modern luxury. We craft not just scents, but moments of profound reflection.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhki3C6gDAjRNyDBV8U_XwUQ2ImFWQtx2MDVAV6-txhuaUJJusdbUKfIx4WqlqYFHUVOvPX_RewEzDEdfGBHF0Qd3ZR8nZvMPR2pMnxPXwUpfZ7QfPBArUJstd22K36Xh8-mx5KR9GiD5_JOIj46R5qaVqZ6WtF8u_OEvAqJcM1IpCy_2fsszkAgP65FGbLlVv1wxNFh_Vv5b8K_KoZ2szdmJtOCI4ommDZunH61nESrJ-BmwYnKHfQu0fqdHngk12xhYSf4_wXg'
    },
    heritage: {
      title: 'Our Heritage',
      subtitle: 'Our Story',
      largeBlockTitle: 'Roots in Antiquity',
      largeBlockText: 'Our lineage traces back to the ancient incense routes. Based in Ayodhya, the sacred land of Lord Rama, we preserve techniques passed down through generations of master distillers to bring divine fragrances to the world.',
      largeBlockImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpfyKq-fTIeobDe10wnwUKsCdFkuDC0sCEgReGlXb3uCiLwnlrQmUwHNkdvnTeWr-GpKUV2NTazq_bBnA0mbopwqBESctUoLgcp4UNQJj214y1fnaT3mWnrc4D5FC-aeN3008Myp9DPZtLbmn69XxI10aQBOkn5Ls9H9GFWMWuWS0v2wRcGDLRZiFsaImWqOpZ839tUgFz5ON5WtKpWhPJZYrjqLyXjG0jrMJE2thBcciaj6dO7qzPrJvSXp3XrbhlsIUKg2dlXw',
      smallBlock1Title: 'Pure Essence',
      smallBlock1Text: 'We source only the absolute highest grade of raw materials—rare ouds, wild-harvested resins, and pristine florals.',
      smallBlock2Title: 'Time Honored',
      smallBlock2Text: 'True luxury cannot be rushed. Our attars undergo extensive maturation processes in optimal conditions to achieve their final, complex profiles.',
      mediumBlockTitle: 'A Modern Interpretation',
      mediumBlockText: 'While our roots are traditional, our vision is contemporary. We strip away the unnecessary, focusing on the profound beauty of singular, exquisite notes allowed to breathe in a minimalist composition.',
      mediumBlockImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBn1kiFiE9F4b9hfkotXX0gtBtfkxaoqIm3u9f3mIzjHJDAic9Vzthv3R1N-5fwis6V1yDZHyW41nxoExNJAs5F45e8dyhqyK3ZrJ77w2Imc07cML4XX-Q3bfxRJjSDd34LsigxeKQ3vNYtNkMyEMkQUQN3zbHCJO94c6lydw3KbT-UuDJRaSaTrH66Q82srdeO8jwIOVk-ucGL2b1RgeYxrAXiuF-PT9PkM0usauRBb3Y0mxyHoqSilzSVN-2H9VHSv1dYCNm-1A'
    },
    sustainability: {
      title: 'Sustainability & Ethics',
      subtitle: 'Intentional Sourcing',
      description: 'The earth offers its most precious aromas, and we believe in honoring that gift through radical transparency and ethical stewardship. We partner directly with artisan growers and distillers, ensuring fair compensation and sustainable harvesting practices.',
      points: [
        'Traceable botanical origins.',
        'Cruelty-free and vegan formulations.',
        'Minimalist, recyclable packaging.'
      ],
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyi8RPVcL4Byn0Dysy6Q9rZUhyhxRz6lyNpnPjXF6L8SA60toE6Pl4yg-35W_CFodPYFEGszFBO00WrGVEoQmjxIRP3zgDqbPdMlzP5n1i8k5cEthoxPCBC7MNAftEEd-wpZN9pR6VCieuiw5ynrp4PZJ9gl6oFmUPuOmNsqMv002xo0mL_EyJ_dCYTU1GheMSTkStAVJUburAJ1NCrf3Ocq9ZsZNQ0XIPQAr0bmMllR1VUR7NTxstQYNuzawvicUrrcvHm4UnIg',
      buttonText: 'Read Our Manifesto',
      buttonLink: '/contact'
    },
    cta: {
      title: 'Experience the Craft',
      description: 'Explore our foundational collections or inquire about our bespoke olfactory design services.',
      button1Text: 'Explore Collections',
      button1Link: '/collection',
      button2Text: 'Bespoke Inquiries',
      button2Link: '/contact'
    }
  });

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

  const handleChange = (section: string, field: string, value: string) => {
    setContent(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const handlePointChange = (index: number, value: string) => {
    const newPoints = [...content.sustainability.points];
    newPoints[index] = value;
    setContent(prev => ({
      ...prev,
      sustainability: {
        ...prev.sustainability,
        points: newPoints
      }
    }));
  };

  const handleImageUpload = async (section: string, field: string, file: File) => {
    try {
      const toastId = toast.loading('Uploading image...');
      const url = await cmsService.uploadImage(file);
      handleChange(section, field, url);
      toast.success('Image uploaded successfully', { id: toastId });
    } catch (error) {
      toast.error('Failed to upload image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await cmsService.updatePage('about', JSON.stringify(content));
      toast.success('About Us page updated successfully');
    } catch (err) {
      toast.error('Failed to update About Us page');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">About Us Page Content</h1>
          <p className="text-sm text-gray-500">Edit the content displayed on the public About Us page.</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-8">
        {/* Hero Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Hero Section</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subtitle</label>
              <input type="text" className="input input-bordered w-full" value={content.hero.subtitle} onChange={(e) => handleChange('hero', 'subtitle', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input type="text" className="input input-bordered w-full" value={content.hero.title} onChange={(e) => handleChange('hero', 'title', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea className="textarea textarea-bordered w-full h-24" value={content.hero.description} onChange={(e) => handleChange('hero', 'description', e.target.value)}></textarea>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Background Image <span className="text-gray-400 text-xs ml-2">(Recommended: 16:9 High Resolution)</span></label>
              {content.hero.image && (
                <div className="relative inline-block mb-2">
                  <img src={content.hero.image} alt="Preview" className="w-full h-32 object-cover rounded-md border border-gray-200" />
                  <button type="button" onClick={() => handleChange('hero', 'image', '')} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 text-xs shadow hover:bg-red-600 focus:outline-none" title="Remove image">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )}
              <input type="file" accept="image/*" className="file-input file-input-bordered w-full" onChange={(e) => {
                if (e.target.files && e.target.files[0]) handleImageUpload('hero', 'image', e.target.files[0]);
              }} />
            </div>
          </div>
        </div>



        {/* Sustainability Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Sustainability Section</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subtitle</label>
              <input type="text" className="input input-bordered w-full" value={content.sustainability.subtitle} onChange={(e) => handleChange('sustainability', 'subtitle', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input type="text" className="input input-bordered w-full" value={content.sustainability.title} onChange={(e) => handleChange('sustainability', 'title', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea className="textarea textarea-bordered w-full h-24" value={content.sustainability.description} onChange={(e) => handleChange('sustainability', 'description', e.target.value)}></textarea>
            </div>
            {content.sustainability.points.map((point, index) => (
              <div key={index} className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Bullet Point {index + 1}</label>
                <input type="text" className="input input-bordered w-full" value={point} onChange={(e) => handlePointChange(index, e.target.value)} />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Image <span className="text-gray-400 text-xs ml-2">(Recommended: 3:4 Portrait)</span></label>
              {content.sustainability.image && (
                <div className="relative inline-block mb-2">
                  <img src={content.sustainability.image} alt="Preview" className="w-32 h-40 object-cover rounded-md border border-gray-200" />
                  <button type="button" onClick={() => handleChange('sustainability', 'image', '')} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs shadow hover:bg-red-600 focus:outline-none" title="Remove image">
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                </div>
              )}
              <input type="file" accept="image/*" className="file-input file-input-bordered w-full" onChange={(e) => {
                if (e.target.files && e.target.files[0]) handleImageUpload('sustainability', 'image', e.target.files[0]);
              }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Button Text</label>
              <input type="text" className="input input-bordered w-full" value={content.sustainability.buttonText} onChange={(e) => handleChange('sustainability', 'buttonText', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Button Link</label>
              <input type="text" className="input input-bordered w-full" value={content.sustainability.buttonLink} onChange={(e) => handleChange('sustainability', 'buttonLink', e.target.value)} />
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Footer CTA Section</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input type="text" className="input input-bordered w-full" value={content.cta.title} onChange={(e) => handleChange('cta', 'title', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea className="textarea textarea-bordered w-full h-20" value={content.cta.description} onChange={(e) => handleChange('cta', 'description', e.target.value)}></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Button 1 Text</label>
              <input type="text" className="input input-bordered w-full" value={content.cta.button1Text} onChange={(e) => handleChange('cta', 'button1Text', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Button 1 Link</label>
              <input type="text" className="input input-bordered w-full" value={content.cta.button1Link} onChange={(e) => handleChange('cta', 'button1Link', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Button 2 Text</label>
              <input type="text" className="input input-bordered w-full" value={content.cta.button2Text} onChange={(e) => handleChange('cta', 'button2Text', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Button 2 Link</label>
              <input type="text" className="input input-bordered w-full" value={content.cta.button2Link} onChange={(e) => handleChange('cta', 'button2Link', e.target.value)} />
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};
