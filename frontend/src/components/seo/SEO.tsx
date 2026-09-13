import React from 'react';
import { Helmet } from 'react-helmet-async';
import { APP_NAME } from '../../utils/constants';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { getImageUrl } from '../../utils/getImageUrl';

interface SEOProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  type?: 'website' | 'article' | 'product';
  imageUrl?: string;
  schema?: Record<string, any>;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonicalUrl,
  type = 'website',
  imageUrl,
  schema,
}) => {
  const { settings } = useStoreSettings();
  
  const fullTitle = title.includes(APP_NAME) ? title : `${title} | ${APP_NAME}`;
  const siteUrl = 'https://alahadattars.com';
  const url = canonicalUrl ? `${siteUrl}${canonicalUrl}` : siteUrl;
  const finalImageUrl = imageUrl || (settings?.brandLogoUrl ? getImageUrl(settings.brandLogoUrl) : `${siteUrl}/brand-logo.jpg`);

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={finalImageUrl} />
      <meta property="og:site_name" content={APP_NAME} />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={finalImageUrl} />

      {/* Structured Data (JSON-LD) */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
};
