import Image from 'next/image';

export default function GalleryBlock({ gallery }: { gallery: string[] }) {
  if (!gallery?.length) return null;

  return (
    <section className="mt-section">
      <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">Галерея</h2>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {gallery.map((src) => (
          <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-md border border-border-primary">
            <Image
              src={src}
              alt="ROSPARK equipment"
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
              priority={false}
            />
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-text-secondary">
        Примечание: полноэкранный просмотрщик можно добавить на следующем витке (v1.3+), не влияя на текущую архитектуру.
      </p>
    </section>
  );
}
