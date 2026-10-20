"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link, { LinkProps } from 'next/link';

export type TransitionDirection = 'to-ebooks' | 'to-main' | 'none';
export type AnimationClass = 
  | ''
  | 'section-slide-out-left'
  | 'section-slide-in-right'
  | 'section-slide-out-right'
  | 'section-slide-in-left';

interface SectionTransitionContextType {
  animationClass: AnimationClass;
  navigateWithTransition: (
    e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
    targetHref: string,
    direction: 'to-ebooks' | 'to-main'
  ) => void;
}

const SectionTransitionContext = createContext<SectionTransitionContextType>({
  animationClass: '',
  navigateWithTransition: () => {},
});

export const useSectionTransition = () => useContext(SectionTransitionContext);

function isEBookRoute(path: string): boolean {
  return (
    path.startsWith('/e-books') ||
    path.startsWith('/my-books') ||
    path.startsWith('/cart') ||
    path.startsWith('/checkout')
  );
}

const ANIMATION_DURATION_MS = 350;
const SESSION_TRANSITION_KEY = 'kp_section_transition_dir';

export function SectionTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [animationClass, setAnimationClass] = useState<AnimationClass>('');
  const prevPathnameRef = useRef<string>(pathname);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Handle route change / entrance animations
  useEffect(() => {
    const prevPath = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    if (prevPath === pathname) return;

    // Check if reduced motion is requested
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setAnimationClass('');
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(SESSION_TRANSITION_KEY);
      }
      return;
    }

    // Determine if we crossed the boundary between Main Platform and E-Books
    const wasEBooks = isEBookRoute(prevPath);
    const isEBooks = isEBookRoute(pathname);

    let pendingDirection = '';
    if (typeof window !== 'undefined') {
      pendingDirection = sessionStorage.getItem(SESSION_TRANSITION_KEY) || '';
      sessionStorage.removeItem(SESSION_TRANSITION_KEY);
    }

    if (pendingDirection === 'to-ebooks' || (!wasEBooks && isEBooks)) {
      // Main KnowledgePaat -> E-Books: eBook section enters from the right
      clearTimer();
      setAnimationClass('section-slide-in-right');
      timerRef.current = setTimeout(() => {
        setAnimationClass('');
      }, ANIMATION_DURATION_MS);
    } else if (pendingDirection === 'to-main' || (wasEBooks && !isEBooks)) {
      // E-Books -> Main KnowledgePaat: Main content enters from the left
      clearTimer();
      setAnimationClass('section-slide-in-left');
      timerRef.current = setTimeout(() => {
        setAnimationClass('');
      }, ANIMATION_DURATION_MS);
    } else {
      setAnimationClass('');
    }

    return () => {
      clearTimer();
    };
  }, [pathname, clearTimer]);

  const navigateWithTransition = useCallback(
    (
      e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
      targetHref: string,
      direction: 'to-ebooks' | 'to-main'
    ) => {
      // Preserve standard browser behaviors:
      // Ctrl/Cmd-click, Shift-click, Alt-click, or non-left mouse button opens new tab/window
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0
      ) {
        return;
      }

      e.preventDefault();

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        router.push(targetHref);
        return;
      }

      // Record expected entrance direction in session storage for the incoming route
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_TRANSITION_KEY, direction);
      }

      clearTimer();

      if (direction === 'to-ebooks') {
        // Main KnowledgePaat -> E-Books: Main content slides left
        setAnimationClass('section-slide-out-left');
      } else {
        // E-Books -> Main KnowledgePaat: eBook content slides right
        setAnimationClass('section-slide-out-right');
      }

      // Fire navigation immediately - do not delay navigation solely to finish an animation
      router.push(targetHref);

      // Failsafe cleanup in case navigation fails or is aborted
      timerRef.current = setTimeout(() => {
        setAnimationClass('');
      }, ANIMATION_DURATION_MS + 100);
    },
    [router, clearTimer]
  );

  return (
    <SectionTransitionContext.Provider
      value={{
        animationClass,
        navigateWithTransition,
      }}
    >
      <div className={`section-transition-wrapper ${animationClass}`}>
        {children}
      </div>
    </SectionTransitionContext.Provider>
  );
}

interface SectionTransitionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  direction: 'to-ebooks' | 'to-main';
  children: React.ReactNode;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

export function SectionTransitionLink({
  href,
  direction,
  children,
  className,
  id,
  'aria-label': ariaLabel,
  onClick,
  ...props
}: SectionTransitionLinkProps) {
  const { navigateWithTransition } = useSectionTransition();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
    }
    if (!e.defaultPrevented) {
      navigateWithTransition(e, href, direction);
    }
  };

  return (
    <Link
      href={href}
      id={id}
      aria-label={ariaLabel}
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
}
