"use client";

import { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export function ScrollReveal({ 
  children, 
  className = "", 
  threshold = 0.1, 
  delay = 0,
  direction = 'up'
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = ref.current;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Optional: Disconnect after first reveal if we only want it to happen once
          if (currentRef) {
            observer.unobserve(currentRef);
          }
        }
      },
      {
        threshold,
        // Add a root margin to trigger slightly before the element enters the viewport
        rootMargin: "0px 0px -50px 0px" 
      }
    );

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  // Determine initial translation based on direction
  const getInitialTranslation = () => {
    switch (direction) {
      case 'up': return 'translate-y-8';
      case 'down': return '-translate-y-8';
      case 'left': return 'translate-x-8';
      case 'right': return '-translate-x-8';
      case 'none': return '';
      default: return 'translate-y-8';
    }
  };

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-1000 ease-out ${
        isVisible 
          ? "opacity-100 translate-y-0 translate-x-0" 
          : `opacity-0 ${getInitialTranslation()}`
      } ${className}`}
    >
      {children}
    </div>
  );
}
