import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export const useNavigation = () => {
  const router = useRouter();

  const navigate = useCallback((href: string) => {
    try {
      // Try client-side navigation first
      router.push(href);
    } catch (error) {
      // Fallback to window.location for static export
      console.log('Using fallback navigation for:', href);
      window.location.href = href;
    }
  }, [router]);

  const navigateReplace = useCallback((href: string) => {
    try {
      // Try client-side navigation first
      router.replace(href);
    } catch (error) {
      // Fallback to window.location for static export
      console.log('Using fallback navigation replace for:', href);
      window.location.replace(href);
    }
  }, [router]);

  return {
    navigate,
    navigateReplace,
    router
  };
};


