export type NavItem = {
  label: string;
  href?: string;
  children?: Array<{ label: string; href: string }>;
};

export const headerNav: NavItem[] = [
  {
    label: 'Решения',
    children: [
      { label: 'Сравнение подходов', href: '/resheniya/sravnenie-podhodov' },
      { label: 'Для руководства', href: '/resheniya/dlya-rukovodstva' },
      { label: 'Для IT-директора', href: '/resheniya/dlya-it-direktora' },
    ],
  },
  {
    label: 'Возможности',
    children: [
      { label: 'Гибкая тарификация', href: '/vozmozhnosti/gibkaya-tarifikaciya' },
      { label: 'Интеграции и API', href: '/vozmozhnosti/integracii-i-api' },
      { label: 'Распознавание номеров', href: '/vozmozhnosti/raspoznavanie-nomerov' },
      { label: 'Абонементы и RFID', href: '/vozmozhnosti/abonementy-i-rfid' },
      { label: 'Онлайн-оплата', href: '/vozmozhnosti/onlain-oplata' },
    ],
  },
  { label: 'Как мы работаем', href: '/kak-my-rabotaem' },
  { label: 'Оборудование', href: '/oborudovanie' },
  { label: 'Кейсы', href: '/keisy' },
];

// Для мобильного меню проще отрендерить плоский список
export const mobileNav = headerNav.flatMap((item) => {
  if (item.children && item.children.length) return item.children;
  if (item.href) return [{ label: item.label, href: item.href }];
  return [];
});
