"use client";

import { motion, useReducedMotion } from "framer-motion";

import { a7Motion } from "@/lib/motion";

function RouteFade({ children }: Readonly<{ children: React.ReactNode }>) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0.82, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : a7Motion.base}
    >
      {children}
    </motion.div>
  );
}

export { RouteFade };
