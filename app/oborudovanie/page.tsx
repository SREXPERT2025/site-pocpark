
import EquipmentCatalogClient from './EquipmentCatalogClient';
import { getAllEquipment } from '@/lib/equipment';

export default async function Page() {
  const items = await getAllEquipment();
  return (
    <section className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-10">Оборудование</h1>
      <EquipmentCatalogClient items={items} />
    </section>
  );
}
