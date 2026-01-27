
'use client';
import Link from 'next/link';
import Image from 'next/image';

export default function EquipmentCard({ title, description, price, image, slug }) {
  return (
    <Link href={`/oborudovanie/${slug}`} className="group block rounded-[15px] bg-white transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="aspect-square overflow-hidden rounded-t-[15px] bg-white">
        <Image src={image} alt={title} width={600} height={600} className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-col gap-3 p-5">
        <h3 className="text-[20px] font-bold">{title}</h3>
        {description && <p className="text-[14px] text-gray-600 line-clamp-3">{description}</p>}
        {price && <div className="mt-auto font-semibold">{price}</div>}
      </div>
    </Link>
  );
}
