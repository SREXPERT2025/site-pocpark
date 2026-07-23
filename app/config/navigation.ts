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
    href: '/resheniya',
    groups: [
      {
        label: 'По ролям',
        items: [
          {
            label: 'Для руководителей',
            href: '/resheniya/dlya-rukovoditeley',
            description: 'Контроль выручки, затрат и загрузки парковки',
          },
          {
            label: 'Для инженеров',
            href: '/resheniya/dlya-inzhenerov',
            description: 'Интеграции, обмен данными, схемы, эксплуатационная надёжность',
          },
          {
            label: 'Для службы безопасности',
            href: '/resheniya/dlya-sluzhby-bezopasnosti',
            description: 'Контроль доступов, события, архив, контроль злоупотреблений',
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
            description: 'Резиденты, гости, заявки, лимиты, регламенты охраны',
          },
          {
            label: 'Складские комплексы',
            href: '/resheniya/skladskie-kompleksy',
            description: 'Проезды грузового транспорта, спец. режимы, пропуска, контроль',
          },
          {
            label: 'Застройщики',
            href: '/resheniya/zastroyschiki',
            description: 'Парковка для УК и жителей: доступ, оплата и контроль',
          },
        ],
      },
      {
        label: 'Процесс',
        items: [
          {
            label: 'Как мы работаем',
            href: '/resheniya/kak-my-rabotaem',
            description: 'Этапы внедрения: обследование, проектирование, запуск и поддержка',
          },
          {
            label: 'Стоимость автоматизации',
            href: '/resheniya/stoimost-avtomatizacii-parkovki',
            description: 'Из чего складывается бюджет парковочной системы',
          },
          {
            label: 'Интеграции и обмен данными',
            href: '/resheniya/integracii-i-api',
            description: 'Связь парковки со СКУД, 1С, сайтом и внутренними системами',
          },
        ],
      },
      {
        label: 'Технологии',
        items: [
          {
            label: 'Онлайн-оплата',
            href: '/vozmozhnosti/onlain-oplata',
            description: 'QR, сайт, приложение и платёжные сценарии без кассиров',
          },
          {
            label: 'Распознавание номеров',
            href: '/vozmozhnosti/raspoznavanie-nomerov',
            description: 'Распознавание ГРНЗ для въезда, выезда, гостей, абонементов и контроля',
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
          {
            label: 'Все возможности',
            href: '/vozmozhnosti',
            description: 'Описание всех возможностей',
          },
        ],
      },
    ],
  },
  {
    label: 'Оборудование',
    href: '/oborudovanie',
    groups: [
      {
        label: 'Категории',
        items: [
          {
            label: 'Все оборудование',
            href: '/oborudovanie',
            description: 'Каталог стоек, шлагбаумов, терминалов, табло и периферии',
          },
          {
            label: 'Шлагбаумы',
            href: '/oborudovanie/shlagbaumy',
            description: 'Российские автоматические шлагбаумы для парковок и контролируемых въездов',
          },
        ],
      },
      {
        label: 'Модели шлагбаумов',
        items: [
          {
            label: 'Шлагбаум 3 м',
            href: '/oborudovanie/shlagbaum-rospark-3',
            description: 'Для проездов меньшей ширины',
          },
          {
            label: 'Шлагбаум 4 м',
            href: '/oborudovanie/shlagbaum-rospark-4',
            description: 'Универсальный вариант для типовых въездов',
          },
        ],
      },
    ],
  },
  {
    label: 'Демо ПО',
    href: '/demo',
  },
  {
    label: 'Проекты',
    href: '/keysy',
  },
  {
    label: 'Статьи',
    href: '/stati',
  },
  {
    label: 'Контакты',
    href: '/contacts',
  },
];
