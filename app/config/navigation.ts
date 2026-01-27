export type NavLink = {
  label: string;
  href: string;
  description?: string;
};

export type NavGroup = {
  label: string;
  items: NavLink[];
};

export type NavItem = {
  label: string;
  /**
   * Если указан href и groups, то label ведёт на href, а также открывает выпадающее меню.
   */
  href?: string;
  groups?: NavGroup[];
};

/**
 * Единый источник навигации (Sitemap v1.1)
 * Важно: сюда попадают только страницы, которые помечены как «В меню: Да».
 */
export const navigation: NavItem[] = [
  {
    label: 'Решения',
    groups: [
      {
        label: 'По ролям',
        items: [
          {
            label: 'Для руководителей',
            href: '/resheniya/dlya-rukovoditeley',
            description: 'NOI, контроль выручки, прозрачность и управляемость',
          },
          {
            label: 'Для инженеров',
            href: '/resheniya/dlya-inzhenerov',
            description: 'Интеграции, API, схемы, эксплуатационная надёжность',
          },
          {
            label: 'Для службы безопасности',
            href: '/resheniya/dlya-sluzhby-bezopasnosti',
            description: 'Контроль доступов, события, архив, антифрод',
          },
        ],
      },
      {
        label: 'По объектам',
        items: [
          {
            label: 'Торговые центры',
            href: '/resheniya/torgovye-centry',
            description: 'Поток разовых клиентов, пики, онлайн-оплата, очереди',
          },
          {
            label: 'Бизнес-центры',
            href: '/resheniya/biznes-centry',
            description: 'Резиденты, гости, заявки, лимиты, SLA охраны',
          },
          {
            label: 'Складские комплексы',
            href: '/resheniya/skladskie-kompleksy',
            description: 'Проезды грузового транспорта, спец. режимы, пропуска, контроль',
          },
          {
            label: 'Застройщики',
            href: '/resheniya/zastroyschiki',
            description: 'Паркинг как сервис для УК и жителей, контроль и монетизация',
          },
        ],
      },
    ],
  },
  {
    label: 'Возможности',
    href: '/vozmozhnosti',
    groups: [
      {
        label: 'Типы клиентов',
        items: [
          {
            label: 'Постоянные клиенты',
            href: '/vozmozhnosti/postoyannie-klienti',
            description: 'Абонементы, распознавание, доступ 24/7, отчётность',
          },
          {
            label: 'Арендные клиенты',
            href: '/vozmozhnosti/arendnie-klienti',
            description: 'Договоры, привязка к компаниям, лимиты и правила доступа',
          },
          {
            label: 'Разовые клиенты',
            href: '/vozmozhnosti/razovie-klienti',
            description: 'Билет/номер, тарификация, онлайн-оплата, ускорение выезда',
          },
          {
            label: 'Гостевые клиенты',
            href: '/vozmozhnosti/gostevie-klienti',
            description: 'Заявки, временный доступ, подтверждение, безопасность',
          },
        ],
      },
    ],
  },
  {
    label: 'Оборудование',
    href: '/oborudovanie',
  },
  {
    label: 'Проекты',
    href: '/keysy',
  },
  {
    label: 'Контакты',
    href: '/contacts',
  },
];
