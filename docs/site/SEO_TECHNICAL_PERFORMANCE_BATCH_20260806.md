# РОСПАРК — технический SEO и performance-блок накопительного релиза

Дата: 2026-08-06
Статус: `LOCAL_CANDIDATE_VERIFIED`
Production: не изменён

## Цель

Дополнить контентный SEO/GEO-пакет безопасными изменениями доставки без
перестройки страниц, форм, AI-виджета и аналитики.

## Performance

- для главного видео подготовлен versioned poster 1600×900 размером менее
  150 КБ;
- poster получает immutable cache header вместе с versioned video;
- видео загружается только на экранах от 768 px и только при отсутствии
  `prefers-reduced-motion`;
- на мобильных и при reduced motion Hero сохраняет тот же кадр и композицию,
  но не загружает фоновый MP4;
- три изображения блока «Решения под тип объекта» переведены с обычного
  `<img>` на responsive Next Image с корректным `sizes`.

## Technical SEO

- публичные страницы остаются разрешёнными для обхода;
- robots.txt закрывает от обхода `/admin/`, `/api/`, embed, quiz и закрытые
  demo-сценарии;
- индексируемый `/demo` остаётся разрешённым;
- `/parkovka` и `/parkovka-pod-klyuch` остаются в sitemap;
- архивные варианты лендингов остаются вне sitemap и закрываются production
  middleware;
- `/puzzle2` продолжает перенаправляться на `/parkovka-pod-klyuch`.

## Проверки

- `test:home-hero-media` контролирует бюджеты MP4/poster, media gate и cache;
- `test:technical-seo-delivery` контролирует robots, sitemap, preview routes и
  landing redirect;
- TypeScript, ESLint, GEO/SEO/image/search-monitor tests и `git diff --check`
  проходят;
- production-сборка сформировала все 116 страниц;
- браузерная проверка подтвердила: на 390 px `currentSrc` видео пустой и виден
  poster, на 1440 px MP4 загружен и воспроизводится;
- responsive object images имеют `srcset`, `sizes` и сохраняют размеры карточек;
- локальный robots.txt и immutable cache headers MP4/poster приняты.

## Ограничения

- исходный `/hero.mp4` не удаляется: master и rollback-история сохраняются;
- публичные URL, согласованные тексты, CTA, формы, аналитика и AI не меняются;
- публикация выполняется только единым накопительным релизом после отдельного
  подтверждения владельца.
