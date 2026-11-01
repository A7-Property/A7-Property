"use client";

import { memo, useEffect, useRef, useState } from "react";
import { HERO_SLIDES, HERO_SLIDE_INTERVAL_MS } from "@/lib/hero-slides";
import { ProgressiveImage } from "./progressive-image";
import styles from "./hero-slideshow.module.css";

export const HeroSlideshow = memo(function HeroSlideshow({ sizes }: { sizes: string }) {
  const ready = useRef(new Set<number>());
  const [slide, setSlide] = useState({ current: 0, previous: 0 });

  useEffect(() => {
    if (HERO_SLIDES.length < 2) return;
    const interval = window.setInterval(() => {
      setSlide((previous) => {
        // Keep the current image if the next candidates failed or are still loading.
        for (let offset = 1; offset < HERO_SLIDES.length; offset++) {
          const next = (previous.current + offset) % HERO_SLIDES.length;
          if (ready.current.has(next)) return { current: next, previous: previous.current };
        }
        return previous;
      });
    }, HERO_SLIDE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className={styles.background} aria-hidden="true" data-hero-slideshow>
      {HERO_SLIDES.map((src, index) => (
        <div
          key={`${index}-${src}`}
          className={styles.slide}
          data-active={index === slide.current}
          data-previous={index === slide.previous}
        >
          <ProgressiveImage
            src={src}
            alt=""
            fill
            sizes={sizes}
            preload={index === 0}
            loading={index === 0 ? undefined : "eager"}
            onLoad={() => { ready.current.add(index); }}
            onError={() => { ready.current.delete(index); }}
            className={styles.image}
          />
        </div>
      ))}
    </div>
  );
});
