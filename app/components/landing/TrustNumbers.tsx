type TrustNumber = {
  value: string;
  label: string;
};

const NUMBERS: TrustNumber[] = [
  { value: "15+", label: "лет на рынке" },
  { value: "50+", label: "городов присутствия" },
  { value: "150+", label: "объектов в эксплуатации" },
];

export default function TrustNumbers() {
  return (
    <section className="bg-white py-10 sm:py-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {NUMBERS.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
            >
              <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
                {item.value}
              </div>
              <div className="mt-1 text-sm sm:text-base text-slate-600">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
