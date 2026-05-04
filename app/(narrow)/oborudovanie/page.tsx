
import EquipmentCatalogClient from './EquipmentCatalogClient';
import { getAllEquipment } from '@/lib/equipment';

export default async function Page() {
  const items = await getAllEquipment();
  return (
    <section className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-5">Оборудование для автоматизации парковки</h1>
      <p className="mb-10 max-w-3xl text-lg leading-relaxed text-slate-600">
        Оборудование подбирается под объект: въезд, выезд, оплата, распознавание номеров, табло и управление доступом.
      </p>
      <EquipmentCatalogClient items={items} />
    </section>
  );
}
