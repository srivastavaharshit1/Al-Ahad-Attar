import { useCallback, useRef, useState } from 'react';

/**
 * Tracks whether an element has scrolled into view, for the `.reveal` entrance animation.
 *
 * Uses a callback ref rather than `useRef` + `useEffect` because the observed element is
 * frequently mounted conditionally (e.g. only after data finishes loading) — a plain
 * `useRef`'s effect runs once on the initial render, before such an element exists, and
 * never re-attaches once it does. A callback ref re-fires every time React attaches or
 * detaches the DOM node, so late-mounting elements are still observed correctly.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const [inView, setInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (node) {
      const io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      }, { threshold });
      io.observe(node);
      observerRef.current = io;
    }
  }, [threshold]);

  return { ref, inView };
}
