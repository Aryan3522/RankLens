"use client";

import React, { useRef } from "react";
import {
  motion,
  useMotionValue,
  useScroll,
  useVelocity,
  useSpring,
  useTransform,
  useAnimationFrame,
  useMotionTemplate,
} from "framer-motion";
import { useState } from "react";

const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

const MarqueeTrack = ({ items = [], renderItem, children, baseVelocity = -2, className = "", containerRef }: any) => {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll(containerRef ? { container: containerRef } : undefined);
  const scrollVelocity = useVelocity(scrollY);

  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 150,
  });

  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
    clamp: false,
  });

  const skewX = useTransform(smoothVelocity, [-2000, 2000], [-30, 30]);
  const rotateZ = useTransform(smoothVelocity, [-2000, 2000], [-15, 15]);

  const x = useTransform(baseX, (v) => `${wrap(-50, 0, v)}%`);

  const directionFactor = useRef(1);

  useAnimationFrame((t, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 16);

    if (velocityFactor.get() < 0) {
      directionFactor.current = -1;
    } else if (velocityFactor.get() > 0) {
      directionFactor.current = 1;
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();

    baseX.set(baseX.get() + moveBy);
  });

  const renderContent = () => {
    if (items && items.length > 0) {
      return items.map((item: any, i: number) => {
        if (renderItem) {
          return renderItem(item, i, skewX, rotateZ);
        }
        return <GlowingCard key={i} item={item} skewX={skewX} rotateZ={rotateZ} />;
      });
    }

    return (
      <motion.div style={{ skewX, rotateZ }} className="flex shrink-0">
        {children}
      </motion.div>
    );
  };

  if (!renderItem && !children) return null;

  return (
    <div className={`relative flex w-full overflow-hidden py-10 ${className}`}>
      {}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-16 bg-gradient-to-r from-background to-transparent md:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 bg-gradient-to-l from-background to-transparent md:w-32" />

      <motion.div className="flex shrink-0 gap-6 w-max" style={{ x }}>
        {}
        {[1, 2, 3, 4].map((groupKey) => (
          <div key={groupKey} className="flex shrink-0 gap-6">
            {renderContent()}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export const GlowingCard = ({ item, skewX, rotateZ }: any) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);

  function handleMouseMove({ currentTarget, clientX, clientY }: any) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      style={{ skewX, rotateZ }}
      className="relative flex flex-col group rounded-2xl bg-white/80 dark:bg-[#12161d] border border-black/5 dark:border-white/10 overflow-hidden w-[350px] shrink-0 shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              600px circle at ${mouseX}px ${mouseY}px,
              rgba(255,255,255,0.08),
              transparent 40%
            )
          `,
        }}
      />

      {}
      <motion.div
        className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
        style={{
          background: `radial-gradient(circle at center, var(--tw-gradient-from) 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex flex-col h-full p-6 sm:p-8 backdrop-blur-md">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
              {item.name || item.title}
            </h3>
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              {item.purpose || item.subtitle}
            </span>
          </div>

          {}
          {(item.impact || item.score) && (
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-black/5 dark:text-white/5"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <motion.path
                  initial={{ strokeDasharray: "0, 100" }}
                  whileInView={{ strokeDasharray: `${item.impact || item.score}, 100` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                  className={`text-transparent bg-clip-text bg-gradient-to-r ${item.color || "from-neutral-500 to-neutral-700"}`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="3"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute text-xs font-bold text-neutral-700 dark:text-neutral-300">
                {item.impact || item.score}
              </span>
            </div>
          )}
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 flex-grow leading-relaxed">
          {item.description}
        </p>

        {}
        <div className="mt-6 w-full h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${item.color || "from-neutral-500 to-neutral-700"}`}
            initial={{ width: 0 }}
            animate={{ width: isHovered ? "100%" : "0%" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default MarqueeTrack;