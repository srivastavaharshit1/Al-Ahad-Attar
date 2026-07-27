import React from 'react';

interface PaginationProps {
  currentPage: number; // 0-indexed like Spring Boot
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    // Always show first page, last page, and up to 1 before and 1 after current page
    for (let i = 0; i < totalPages; i++) {
      if (
        i === 0 || 
        i === totalPages - 1 || 
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        pages.push(i);
      }
    }

    // Insert nulls for ellipses
    const pagesWithEllipses = [];
    let prev = -1;
    for (const p of pages) {
      if (prev !== -1 && p - prev > 1) {
        pagesWithEllipses.push(null);
      }
      pagesWithEllipses.push(p);
      prev = p;
    }

    return pagesWithEllipses;
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage > 0) onPageChange(currentPage - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage < totalPages - 1) onPageChange(currentPage + 1);
  };

  return (
    <nav aria-label="Pagination" className="inline-flex items-center gap-2">
      <button 
        onClick={handlePrev}
        disabled={currentPage === 0}
        className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
      </button>

      {getPageNumbers().map((pageIndex, idx) => {
        if (pageIndex === null) {
          return (
            <span key={`ellipsis-${idx}`} className="w-10 h-10 flex items-center justify-center text-on-surface-variant">
              ...
            </span>
          );
        }

        const isActive = pageIndex === currentPage;

        return (
          <button
            key={pageIndex}
            onClick={(e) => { e.preventDefault(); onPageChange(pageIndex); }}
            aria-current={isActive ? "page" : undefined}
            className={`w-10 h-10 flex items-center justify-center font-label-md text-label-md transition-colors ${
              isActive 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            {pageIndex + 1}
          </button>
        );
      })}

      <button 
        onClick={handleNext}
        disabled={currentPage === totalPages - 1}
        className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
      </button>
    </nav>
  );
};
