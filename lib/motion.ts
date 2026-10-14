import type { Transition, Variants } from "framer-motion";

const a7Ease = [0.22, 1, 0.36, 1] as const;

const a7Motion = {
  fast: { duration: 0.16, ease: a7Ease } satisfies Transition,
  base: { duration: 0.22, ease: a7Ease } satisfies Transition,
  slow: { duration: 0.32, ease: a7Ease } satisfies Transition,
  spring: { type: "spring", stiffness: 320, damping: 30, mass: 0.82 } satisfies Transition,
};

const a7FadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: a7Motion.slow },
};

export { a7Ease, a7FadeUp, a7Motion };
