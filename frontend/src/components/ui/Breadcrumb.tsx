import React from 'react';
import { Link } from 'react-router-dom';

interface BreadcrumbProps {
  items: { label: string; href?: string }[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav aria-label="Breadcrumb" className="flex text-on-surface-variant font-label-sm text-label-sm uppercase mb-4">
      <ol className="inline-flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="inline-flex items-center">
            {index > 0 && <span className="material-symbols-outlined text-[16px] mx-1">chevron_right</span>}
            {item.href ? (
              <Link to={item.href} className="hover:text-primary transition-colors">{item.label}</Link>
            ) : (
              <span className="text-on-surface">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
