import type { Metadata } from 'next';

import Hero from './components/Hero';
import PainPoints from './components/PainPoints';
import Control from './components/Control';
import Solution from './components/Solution';
import Reliability from './components/Reliability';
import CallToAction from './components/CallToAction';

export const metadata: Metadata = {
  title: 'Автоматизация парковки для службы безопасности | РОСПАРК',
  description:
    'Решения РОСПАРК для службы безопасности: контроль въезда и выезда, фотофиксация, журналы событий, чёрные списки, работа без интернета.',
};

export default function SecurityPage() {
  return (
    <>
      <Hero />
      <PainPoints />
      <Control />
      <Solution />
      <Reliability />
      <CallToAction />
    </>
  );
}
