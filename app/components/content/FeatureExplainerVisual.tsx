type FeatureExplainerVisualProps = {
  src: string;
  alt: string;
};

export default function FeatureExplainerVisual({
  src,
  alt,
}: FeatureExplainerVisualProps) {
  return (
    <section className="mt-8">
      <div className="mx-auto max-w-4xl">
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          aria-label="Открыть схему крупно"
          className="block overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-sm transition-shadow hover:shadow-md"
        >
          <img
            src={src}
            alt={alt}
            width={1024}
            height={1536}
            className="block h-auto w-full"
            loading="lazy"
            decoding="async"
          />
        </a>
      </div>
    </section>
  );
}
