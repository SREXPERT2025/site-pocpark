export default function Hero() {
  return (
    <section
      className="relative text-white"
      // full-bleed even inside a centered container
      style={{
        width: '100vw',
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw',
        position: 'relative',
      }}
    >
      {/* Background video (file will be added later) */}
      <div className="absolute inset-0">
        <video
          className="h-full w-full object-cover"
          src="/hero.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        {/* 50% dark overlay */}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Content */}
      <div className="relative mx-auto flex h-[775px] max-w-[1400px] items-start justify-center px-4 sm:px-6">
        <div className="w-full max-w-[980px] pt-[110px] text-center">
          <h1 className="text-balance font-extrabold tracking-tight text-[56px] leading-[1.05] sm:text-[64px]">
            Автоматизация парковок
          </h1>
          <p className="mt-5 text-pretty text-[20px] leading-[28px] text-white/90">
            Повышаем выручку и безопасность объектов любого типа.
            <br />
            Решения под ключ: от проекта до обслуживания.
          </p>
        </div>
      </div>
    </section>
  );
}
