import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text?: string;
  url?: string;
  imageUrl?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  title,
  text,
  url,
  imageUrl,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useFocusTrap(modalRef, isOpen);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareText = text || `Discover ${title} by Al Ahad Attars`;

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setCopied(false);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2500);
        return;
      }
    } catch {
      // Fallback below
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  // 1. Direct WhatsApp Share (Opens WhatsApp Web or Mobile App directly without OS dialogs)
  const handleWhatsAppShare = () => {
    const waText = encodeURIComponent(`${shareText}\n${shareUrl}`);
    const waUrl = `https://api.whatsapp.com/send?text=${waText}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  // 2. Direct Instagram Share (Copies link with instant toast, then opens Instagram)
  const handleInstagramShare = async () => {
    try {
      await handleCopy();
      toast.success('Link copied! Opening Instagram…');
      setTimeout(() => {
        window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
      }, 500);
    } catch {
      window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    }
  };

  // 3. Direct Facebook Share
  const handleFacebookShare = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  // 4. Direct Twitter / X Share
  const handleTwitterShare = () => {
    const tweetText = encodeURIComponent(shareText);
    const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareUrl)}`;
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  // 5. Direct Email Share
  const handleEmailShare = () => {
    const mailSubject = encodeURIComponent(title);
    const mailBody = encodeURIComponent(`${shareText}\n\nExplore here: ${shareUrl}`);
    window.location.href = `mailto:?subject=${mailSubject}&body=${mailBody}`;
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#121C2A]/60 backdrop-blur-sm animate-fade-up"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="bg-[#FAF7F0] w-full max-w-md rounded-2xl shadow-[0_25px_60px_rgba(18,28,42,0.35)] overflow-hidden border border-[#E4DCC8] p-6 sm:p-7 relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close dialog"
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-[#121C2A]/60 hover:text-[#121C2A] hover:bg-[#EAE4D4] transition-colors focus:outline-none"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Eyebrow & Title */}
        <div className="text-center mb-5">
          <span className="text-[#C8A55E] text-[10px] uppercase tracking-[0.25em] font-semibold block mb-1">
            ✦ SHARE THIS HARVEST ✦
          </span>
          <h2
            id="share-modal-title"
            className="text-xl sm:text-2xl font-serif font-normal text-[#121C2A]"
          >
            Share with Connoisseurs
          </h2>
          <p className="text-xs text-[#5A6578] mt-1 font-sans">
            Send directly to WhatsApp, social channels, or copy the link below.
          </p>
        </div>

        {/* Product Preview Card */}
        <div className="flex items-center gap-3.5 bg-white p-3 rounded-xl border border-[#E8E2D5] mb-6 shadow-3xs">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-14 h-14 object-cover rounded-lg bg-[#FAF7F0] shrink-0 border border-[#E8E2D5]"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-[#F5F2EB] flex items-center justify-center text-[#C8A55E] shrink-0 font-serif font-semibold text-lg border border-[#E8E2D5]">
              AA
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-sm font-medium text-[#121C2A] truncate">{title}</h3>
            <p className="text-[11px] text-[#8C8270] truncate mt-0.5">Al Ahad Attars · Haute Parfumerie</p>
          </div>
        </div>

        {/* Social Share Buttons Grid */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 mb-6">
          {/* WhatsApp Direct */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl bg-white hover:bg-[#EAFBF0] border border-[#E8E2D5] hover:border-[#25D366] transition-all group cursor-pointer shadow-3xs hover:shadow-xs active:scale-95"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white mb-1 shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-white" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#121C2A] truncate">WhatsApp</span>
          </button>

          {/* Instagram */}
          <button
            type="button"
            onClick={handleInstagramShare}
            className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl bg-white hover:bg-[#FDF2F8] border border-[#E8E2D5] hover:border-[#E1306C] transition-all group cursor-pointer shadow-3xs hover:shadow-xs active:scale-95"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center text-white mb-1 shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-white" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#121C2A] truncate">Instagram</span>
          </button>

          {/* Facebook */}
          <button
            type="button"
            onClick={handleFacebookShare}
            className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl bg-white hover:bg-[#EEF4FF] border border-[#E8E2D5] hover:border-[#1877F2] transition-all group cursor-pointer shadow-3xs hover:shadow-xs active:scale-95"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white mb-1 shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-white" viewBox="0 0 24 24">
                <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.82 0-1.64.214-1.921.614-.263.376-.263.978-.263 2.022v1.344h4.157l-.547 3.667h-3.61v7.98c5.441-.856 9.582-5.568 9.582-11.233C23.673 5.485 18.232 0 11.547 0 4.862 0-.58 5.485-.58 12.458c0 5.665 4.141 10.377 9.681 11.233z" />
              </svg>
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#121C2A] truncate">Facebook</span>
          </button>

          {/* X / Twitter */}
          <button
            type="button"
            onClick={handleTwitterShare}
            className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl bg-white hover:bg-[#F5F2EB] border border-[#E8E2D5] hover:border-[#121C2A] transition-all group cursor-pointer shadow-3xs hover:shadow-xs active:scale-95"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#121C2A] flex items-center justify-center text-white mb-1 shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#121C2A] truncate">X</span>
          </button>

          {/* Email */}
          <button
            type="button"
            onClick={handleEmailShare}
            className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl bg-white hover:bg-[#FAF7F0] border border-[#E8E2D5] hover:border-[#C8A55E] transition-all group cursor-pointer shadow-3xs hover:shadow-xs active:scale-95"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#8C8270] flex items-center justify-center text-white mb-1 shadow-xs group-hover:scale-105 transition-transform">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#121C2A] truncate">Email</span>
          </button>
        </div>

        {/* Copy Link Input Bar */}
        <div>
          <label className="block text-[11px] uppercase tracking-[0.16em] text-[#8C8270] font-medium mb-1.5">
            Or Copy Link
          </label>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-[#E8E2D5] p-1.5 pl-3 shadow-3xs focus-within:border-[#C8A55E] transition-colors">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 text-xs text-[#121C2A] bg-transparent outline-none truncate select-all font-sans"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`h-9 px-4 rounded-lg font-semibold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                copied
                  ? 'bg-[#25D366] text-white shadow-xs'
                  : 'bg-[#121C2A] hover:bg-[#C8A55E] hover:text-[#121C2A] text-white shadow-3xs active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
