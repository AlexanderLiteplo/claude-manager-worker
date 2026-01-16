'use client';

import { ParticleBackground } from './ParticleBackground';
import { SoundToggle } from './SoundToggle';

interface AnimeLayoutWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that adds anime theme elements to the layout
 * - Particle background
 * - Sound toggle button
 */
export function AnimeLayoutWrapper({ children }: AnimeLayoutWrapperProps) {
  return (
    <>
      {/* Animated particle background */}
      <ParticleBackground
        particleCount={40}
        speed={0.3}
        connectionDistance={80}
        showConnections={true}
        opacity={0.2}
        interactive={true}
        shape="circle"
      />

      {/* Main content */}
      {children}

      {/* Sound toggle floating button */}
      <SoundToggle position="bottom-right" />
    </>
  );
}
