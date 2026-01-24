/**
 * Hook to synchronize horizontal scroll across all waveform tracks
 * When one track is scrolled (via touch or mouse), all others follow
 */

import { useEffect } from 'react';

let isScrolling = false;
let scrollTimeoutId: number | null = null;

export const useSyncWaveformScroll = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;

    const syncScroll = (sourceElement: HTMLElement, scrollLeft: number) => {
      // Prevent infinite loop
      if (isScrolling) return;
      isScrolling = true;

      // Find all waveform scroll elements
      const waveformWrappers = document.querySelectorAll('[data-wavesurfer]');
      
      waveformWrappers.forEach((wrapper) => {
        const firstChild = wrapper.firstElementChild;
        
        if (firstChild && firstChild.shadowRoot) {
          const scrollElement = firstChild.shadowRoot.querySelector('.scroll') as HTMLElement;
          
          // Only sync if it's not the source element
          if (scrollElement && scrollElement !== sourceElement) {
            scrollElement.scrollLeft = scrollLeft;
          }
        }
      });

      // Reset flag after a short delay
      if (scrollTimeoutId) {
        clearTimeout(scrollTimeoutId);
      }
      scrollTimeoutId = window.setTimeout(() => {
        isScrolling = false;
      }, 50);
    };

    const handleScroll = (e: Event) => {
      const scrollElement = e.target as HTMLElement;
      
      // Only handle scroll from .scroll elements inside Shadow DOM
      if (scrollElement.classList.contains('scroll')) {
        syncScroll(scrollElement, scrollElement.scrollLeft);
      }
    };

    // Attach scroll listeners to all waveform Shadow DOM scroll elements
    const attachScrollListeners = () => {
      const waveformWrappers = document.querySelectorAll('[data-wavesurfer]');
      
      waveformWrappers.forEach((wrapper) => {
        const firstChild = wrapper.firstElementChild;
        
        if (firstChild && firstChild.shadowRoot) {
          const scrollElement = firstChild.shadowRoot.querySelector('.scroll') as HTMLElement;
          
          if (scrollElement) {
            scrollElement.addEventListener('scroll', handleScroll, { passive: true });
          }
        }
      });
    };

    // Initial attachment
    attachScrollListeners();

    // Re-attach when new tracks are added (with a small delay to ensure DOM is ready)
    const observer = new MutationObserver(() => {
      setTimeout(attachScrollListeners, 100);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Cleanup
    return () => {
      observer.disconnect();
      
      const waveformWrappers = document.querySelectorAll('[data-wavesurfer]');
      waveformWrappers.forEach((wrapper) => {
        const firstChild = wrapper.firstElementChild;
        
        if (firstChild && firstChild.shadowRoot) {
          const scrollElement = firstChild.shadowRoot.querySelector('.scroll') as HTMLElement;
          
          if (scrollElement) {
            scrollElement.removeEventListener('scroll', handleScroll);
          }
        }
      });

      if (scrollTimeoutId) {
        clearTimeout(scrollTimeoutId);
      }
    };
  }, [enabled]);
};
