'use client';

import { motion } from 'framer-motion';
import { clsx } from 'clsx';

type FadeInProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export default function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  return (
    <motion.div
      className={clsx(className)}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut', delay }}
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
