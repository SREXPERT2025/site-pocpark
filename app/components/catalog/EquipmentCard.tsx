'use client';

import Link from 'next/link';
import Image from 'next/image';

type EquipmentCardProps = {
  title: string;
  description?: string;
  price?: string;
  image: string;
  slug: string;
};

export default function EquipmentCard({
  title,
  description,
  price,
  image,
  slug,
}: EquipmentCardProps) {
  return (
    <Link
      href={`/oborudovanie/${slug}`}
      className="group block rounded-[15px] bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="relative h-[260px] overflow-hidden rounded-t-[15px] bg-white p-6 md:h-[300px] lg:h-[320px]">
        <Image
          src={image}
          alt={title}
          fill
          className="object-contain object-center transition-transform duration-300 group-hover:scale-[1.02]"
          sizes="(min-width: 1280px) 33vw, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
        />
      </div>

      <div className="flex min-h-[180px] flex-col gap-3 p-5">
        <h3 className="text-[20px] font-bold leading-tight text-black">{title}</h3>

        {description ? (
          <p className="line-clamp-3 text-[14px] leading-6 text-gray-600">
            {description}
          </p>
        ) : null}

        {price ? <div className="mt-auto font-semibold text-black">{price}</div> : null}
      </div>
    </Link>
  );
}