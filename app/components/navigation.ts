export type NavItem = {
  label: string;
  href?: string;
  children?: {
    label: string;
    href: string;
  }[];
};

export const navigation: NavItem[] = [
  {
    label: "Решения",
    children: [
      {
        label: "Сравнение подходов",
        href: "/resheniya/sravnenie-podhodov",
      },
      {
        label: "Для руководства",
        href: "/resheniya/dlya-rukovoditelya",
      },
      {
        label: "Для IT-директора",
        href: "/resheniya/dlya-it-direktora",
      },
      {
        label: "Как мы работаем",
        href: "/resheniya/kak-my-rabotaem",
      },
    ],
  },
  {
    label: "Возможности",
    children: [
      {
        label: "Гибкая тарификация",
        href: "/vozmozhnosti/gibkaya-tarifikaciya",
      },
      {
        label: "Интеграции и API",
        href: "/vozmozhnosti/integracii-i-api",
      },
      {
        label: "Распознавание номеров",
        href: "/vozmozhnosti/raspoznavanie-nomerov",
      },
      {
        label: "Абонементы и RFID",
        href: "/vozmozhnosti/abonementy-i-rfid",
      },
      {
        label: "Онлайн-оплата",
        href: "/vozmozhnosti/onlain-oplata",
      },
    ],
  },
  {
    label: "Оборудование",
    href: "/oborudovanie",
  },
  {
    label: "Кейсы",
    href: "/keysy",
  },
];
