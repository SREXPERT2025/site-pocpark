type SolutionVisualProps = {
  src: string;
  alt: string;
  className?: string;
};

export default function SolutionVisual({
  src,
  alt,
  className = '',
}: SolutionVisualProps) {
  return (
    <section className={`bg-white py-8 sm:py-10 ${className}`}>
      <div className="container mx-auto max-w-6xl min-w-0 px-4">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-sm">
          <img
            src={src}
            alt={alt}
            className="block aspect-[16/9] h-auto w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}
