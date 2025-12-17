import type { Metadata } from 'next';

import Hero from './components/Hero';
import TechStack from './components/TechStack';
import Integration from './components/Integration';
import Reliability from './components/Reliability';
import Documentation from './components/Documentation';
import CallToAction from './components/CallToAction';

export const metadata: Metadata = {
  title: 'Автоматизация парковки для инженеров — схемы, API, надежность | РОСПАРК',
  description:
    'Технические решения РОСПАРК для инженеров и интеграторов: контроллеры, RS-485, Ethernet, REST API, схемы подключения, документация и поддержка.',
};

export default function EngineersPage() {
  return (
    <>
      <Hero />
      <TechStack />
      <Integration />
      <Reliability />
      <Documentation />
      <CallToAction />
    </>
  );
}
