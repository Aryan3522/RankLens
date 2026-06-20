"use client";

import React from "react";
import MarqueeTrack, { GlowingCard } from "./marquee-track";

const VelocityMarquee = ({ 
  items = [], 
  containerRef 
}: { 
  items: any[];
  containerRef?: React.RefObject<HTMLElement | null>;
}) => {
  return (
    <section className="relative w-full overflow-hidden py-4">
      {}
      <MarqueeTrack 
        items={items} 
        baseVelocity={-0.05} 
        containerRef={containerRef}
        renderItem={(project: any, i: number, skewX: any, rotateZ: any) => (
          <GlowingCard key={`a-${project.name}-${i}`} item={project} skewX={skewX} rotateZ={rotateZ} />
        )} 
      />
      <MarqueeTrack 
        items={[...items].reverse()} 
        baseVelocity={0.05} 
        containerRef={containerRef}
        renderItem={(project: any, i: number, skewX: any, rotateZ: any) => (
          <GlowingCard key={`b-${project.name}-${i}`} item={project} skewX={skewX} rotateZ={rotateZ} />
        )} 
      />

    </section>
  );
};

export default VelocityMarquee;