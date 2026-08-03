const page = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
    <title>Контент лендинга РОСПАРК</title>
    <link rel="stylesheet" href="/parkovka-assets/styles.css" />
    <style>
      html,
      body {
        overflow: hidden;
      }

      .siteHeader,
      .footer {
        display: none !important;
      }

      .heroContent {
        margin-top: clamp(64px, 8vw, 112px);
      }

      @media (max-width: 720px) {
        .heroContent {
          margin-top: 44px;
        }
      }

      .parkovka-ai-promo-section {
        padding-top: 64px !important;
        padding-bottom: 64px !important;
      }

      .parkovka-ai-promo {
        --spot-x: 78%;
        --spot-y: 46%;
        position: relative;
        isolation: isolate;
        min-height: 300px;
        padding: 22px 34px;
        display: grid;
        grid-template-columns: minmax(0, 1.25fr) minmax(270px, 0.75fr);
        align-items: center;
        gap: 34px;
        overflow: hidden;
        border: 1px solid rgb(74 139 255 / 54%);
        border-radius: 18px;
        color: #f7faff;
        background:
          radial-gradient(
            310px circle at var(--spot-x) var(--spot-y),
            rgb(45 116 255 / 17%),
            transparent 68%
          ),
          linear-gradient(135deg, #10243a, #07131f 72%);
        box-shadow: 0 28px 75px rgb(0 0 0 / 27%);
        touch-action: pan-y;
      }

      .parkovka-ai-promo::before {
        content: '';
        position: absolute;
        inset: -1px;
        z-index: -1;
        border-radius: inherit;
        opacity: 0.52;
        background: radial-gradient(
          305px circle at var(--spot-x) var(--spot-y),
          rgb(82 148 255 / 32%),
          transparent 70%
        );
        pointer-events: none;
      }

      .parkovka-ai-promo__copy {
        min-width: 0;
      }

      .parkovka-ai-promo__eyebrow {
        margin: 0 0 9px;
        color: #8eb7ff;
        font-size: 12px;
        font-weight: 850;
        letter-spacing: 0.17em;
        text-transform: uppercase;
      }

      .parkovka-ai-promo h2 {
        max-width: 720px;
        margin: 0;
        font-size: clamp(32px, 3vw, 46px);
        line-height: 1.02;
        letter-spacing: -0.045em;
      }

      .parkovka-ai-promo__description {
        max-width: 760px;
        margin: 11px 0 0;
        color: #bac8d6;
        font-size: 15px;
        line-height: 1.45;
      }

      .parkovka-ai-promo__context {
        min-height: 22px;
        margin: 9px 0 0;
        color: #e5edff;
        font-size: 14px;
        font-weight: 750;
      }

      .parkovka-ai-promo__questions {
        margin-top: 12px;
        display: grid;
        grid-template-columns: 1fr 1.35fr 1.15fr;
        gap: 8px;
      }

      .parkovka-ai-promo__question {
        min-height: 34px;
        padding: 7px 10px;
        border: 1px solid rgb(142 183 255 / 34%);
        border-radius: 999px;
        color: #dce8ff;
        background: rgb(255 255 255 / 6%);
        font: inherit;
        font-size: 12px;
        line-height: 1.35;
        text-align: left;
        cursor: pointer;
        transition: border-color 160ms ease, background 160ms ease;
      }

      .parkovka-ai-promo__question:hover,
      .parkovka-ai-promo__question:focus-visible {
        border-color: #77a9ff;
        background: rgb(60 130 255 / 18%);
      }

      .parkovka-ai-promo__cta {
        min-height: 48px;
        margin-top: 13px;
        padding: 0 22px;
        border: 0;
        border-radius: 8px;
        color: #fff;
        background: #3478ff;
        font: inherit;
        font-weight: 850;
        cursor: pointer;
        box-shadow: 0 14px 34px rgb(52 120 255 / 24%);
        transition: transform 160ms ease, background 160ms ease;
      }

      .parkovka-ai-promo__cta:hover,
      .parkovka-ai-promo__cta:focus-visible {
        transform: translateY(-1px);
        background: #2469ee;
      }

      .parkovka-ai-promo__visual {
        position: relative;
        min-height: 190px;
        display: grid;
        place-items: center;
      }

      .parkovka-ai-promo__orb {
        position: absolute;
        width: 180px;
        height: 180px;
        border-radius: 50%;
        background: radial-gradient(circle, rgb(55 126 255 / 38%), transparent 68%);
        filter: blur(4px);
      }

      .parkovka-ai-promo__chat {
        position: relative;
        width: min(100%, 300px);
        padding: 16px;
        border: 1px solid rgb(255 255 255 / 18%);
        border-radius: 16px;
        background: rgb(7 19 31 / 84%);
        box-shadow: 0 24px 60px rgb(0 0 0 / 34%);
      }

      .parkovka-ai-promo__chat-head {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #fff;
        font-size: 13px;
        font-weight: 850;
      }

      .parkovka-ai-promo__spark {
        display: grid;
        width: 34px;
        height: 34px;
        place-items: center;
        border-radius: 10px;
        background: #3478ff;
        font-size: 18px;
      }

      .parkovka-ai-promo__bubble {
        margin: 16px 0 0;
        padding: 13px 14px;
        border-radius: 13px 13px 13px 4px;
        color: #dce8f5;
        background: rgb(255 255 255 / 9%);
        font-size: 13px;
        line-height: 1.45;
      }

      .parkovka-ai-promo__typing {
        margin-top: 10px;
        display: flex;
        gap: 5px;
      }

      .parkovka-ai-promo__typing span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #78aaff;
      }

      @media (hover: none), (pointer: coarse) {
        .parkovka-ai-promo {
          --spot-x: 86%;
          --spot-y: 28%;
        }

        .parkovka-ai-promo.is-mobile-sweep::before {
          animation: parkovka-ai-sweep 900ms ease-out 1;
        }
      }

      @keyframes parkovka-ai-sweep {
        from { transform: translateX(-34%); opacity: 0.18; }
        to { transform: translateX(0); opacity: 0.52; }
      }

      @media (max-width: 820px) {
        .parkovka-ai-promo-section {
          padding-top: 48px !important;
          padding-bottom: 48px !important;
        }

        .parkovka-ai-promo {
          min-height: 0;
          padding: 30px 24px 24px;
          grid-template-columns: 1fr;
          gap: 24px;
        }

        .parkovka-ai-promo h2 {
          font-size: clamp(32px, 9vw, 44px);
        }

        .parkovka-ai-promo__description {
          font-size: 16px;
        }

        .parkovka-ai-promo__questions {
          display: grid;
          grid-template-columns: 1fr;
        }

        .parkovka-ai-promo__question {
          width: 100%;
          border-radius: 9px;
          text-align: left;
        }

        .parkovka-ai-promo__cta {
          width: 100%;
        }

        .parkovka-ai-promo__visual {
          min-height: 170px;
        }

        .parkovka-ai-promo__orb {
          width: 170px;
          height: 170px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .parkovka-ai-promo,
        .parkovka-ai-promo::before,
        .parkovka-ai-promo__cta,
        .parkovka-ai-promo__question {
          animation: none !important;
          transition: none !important;
        }
      }
    </style>
    <script type="module" src="/parkovka-assets/app.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script>
      (() => {
        if ('scrollRestoration' in history) {
          history.scrollRestoration = 'manual';
        }

        let resettingScroll = false;
        const resetInternalScroll = () => {
          if (resettingScroll) return;
          resettingScroll = true;
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          window.scrollTo(0, 0);
          window.requestAnimationFrame(() => {
            resettingScroll = false;
          });
        };

        resetInternalScroll();

        const reportHeight = () => {
          window.parent.postMessage(
            {
              type: 'rospark:parkovka-height',
              height: document.documentElement.scrollHeight,
            },
            window.location.origin,
          );
        };

        const aiQuestions = [
          'Как убрать очередь на въезде?',
          'Что выбрать: госномера, карты или билеты?',
          'Как организовать въезд для гостей?',
        ];
        let selectedProblem = '';

        const postAiEvent = (eventName, quickQuestion) => {
          window.parent.postMessage(
            {
              type: 'rospark:parkovka-ai-event',
              eventName,
              selectedProblem,
              quickQuestion: quickQuestion || '',
            },
            window.location.origin,
          );
        };

        const openAi = (prompt) => {
          window.parent.postMessage(
            {
              type: 'rospark:parkovka-ai-open',
              selectedProblem,
              prompt,
            },
            window.location.origin,
          );
        };

        const aiPromoMarkup = () => {
          const section = document.createElement('section');
          section.className = 'section parkovka-ai-promo-section';
          section.setAttribute('aria-labelledby', 'parkovka-ai-promo-title');
          section.innerHTML = [
            '<div class="parkovka-ai-promo">',
              '<div class="parkovka-ai-promo__copy">',
                '<p class="parkovka-ai-promo__eyebrow">НЕ ЗНАЕТЕ, С ЧЕГО НАЧАТЬ?</p>',
                '<h2 id="parkovka-ai-promo-title">Опишите задачу AI-консультанту РОСПАРК</h2>',
                '<p class="parkovka-ai-promo__description">Расскажите своими словами, что сейчас происходит на въезде или парковке. AI-консультант поможет разобраться в вариантах и подскажет, с чего начать.</p>',
                '<p class="parkovka-ai-promo__context" aria-live="polite">Выберите проблему выше — AI-консультант учтёт её в вопросе.</p>',
                '<div class="parkovka-ai-promo__questions"></div>',
                '<button type="button" class="parkovka-ai-promo__cta">Задать вопрос AI-консультанту</button>',
              '</div>',
              '<div class="parkovka-ai-promo__visual" aria-hidden="true">',
                '<span class="parkovka-ai-promo__orb"></span>',
                '<div class="parkovka-ai-promo__chat">',
                  '<div class="parkovka-ai-promo__chat-head"><span class="parkovka-ai-promo__spark">✦</span><span>AI-консультант РОСПАРК</span></div>',
                  '<p class="parkovka-ai-promo__bubble">Опишите объект или проблему — подскажу, какие варианты стоит обсудить.</p>',
                  '<div class="parkovka-ai-promo__typing"><span></span><span></span><span></span></div>',
                '</div>',
              '</div>',
            '</div>',
          ].join('');

          const card = section.querySelector('.parkovka-ai-promo');
          const context = section.querySelector('.parkovka-ai-promo__context');
          const questions = section.querySelector('.parkovka-ai-promo__questions');
          const cta = section.querySelector('.parkovka-ai-promo__cta');

          aiQuestions.forEach((question) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'parkovka-ai-promo__question';
            button.textContent = question;
            button.addEventListener('click', () => {
              postAiEvent('ai_quick_question_click', question);
              openAi(question);
            });
            questions.append(button);
          });

          cta.addEventListener('click', () => {
            postAiEvent('ai_promo_click');
            openAi(selectedProblem
              ? 'Я отметил задачу «' + selectedProblem + '». Подскажите, с чего начать.'
              : 'Хочу разобраться, с чего начать автоматизацию парковки.');
          });

          document.addEventListener('click', (event) => {
            const problemCard = event.target.closest('.problemCard');
            if (!problemCard) return;
            selectedProblem = problemCard.querySelector('strong')?.textContent?.trim() || '';
            if (selectedProblem) {
              context.textContent = 'Вы отметили «' + selectedProblem + '». Хотите уточнить возможное решение?';
            }
          }, true);

          if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            card.addEventListener('pointermove', (event) => {
              const bounds = card.getBoundingClientRect();
              card.style.setProperty('--spot-x', (event.clientX - bounds.left) + 'px');
              card.style.setProperty('--spot-y', (event.clientY - bounds.top) + 'px');
            });
            card.addEventListener('pointerleave', () => {
              card.style.setProperty('--spot-x', '78%');
              card.style.setProperty('--spot-y', '46%');
            });
          } else if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const mobileObserver = new IntersectionObserver((entries, observer) => {
              if (!entries.some((entry) => entry.isIntersecting)) return;
              card.classList.add('is-mobile-sweep');
              observer.disconnect();
            }, { threshold: 0.32 });
            mobileObserver.observe(card);
          }

          const viewObserver = new IntersectionObserver((entries, observer) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            postAiEvent('ai_promo_view');
            observer.disconnect();
          }, { threshold: 0.35 });
          viewObserver.observe(card);

          return section;
        };

        const injectAiPromo = () => {
          if (document.querySelector('.parkovka-ai-promo-section')) return true;
          const tasksSection = document.querySelector('.tasksSection');
          if (!tasksSection) return false;
          tasksSection.insertAdjacentElement('afterend', aiPromoMarkup());
          reportHeight();
          return true;
        };

        const injectionObserver = new MutationObserver(() => {
          if (!injectAiPromo()) return;
          injectionObserver.disconnect();
        });
        injectionObserver.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
        injectAiPromo();

        new ResizeObserver(reportHeight).observe(document.documentElement);
        window.addEventListener('scroll', resetInternalScroll, { passive: true });
        window.addEventListener('pageshow', resetInternalScroll);
        window.addEventListener('load', () => {
          resetInternalScroll();
          injectAiPromo();
          reportHeight();
        });
        window.setTimeout(resetInternalScroll, 0);
        window.setTimeout(resetInternalScroll, 250);
        reportHeight();
      })();
    </script>
  </body>
</html>`;

export async function GET() {
  return new Response(page, {
    status: 200,
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'text/html; charset=utf-8',
      'Referrer-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
    },
  });
}
