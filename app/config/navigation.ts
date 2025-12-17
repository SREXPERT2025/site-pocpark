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
        label: "Для руководителей",
        href: "/resheniya/dlya-rukovoditeley",
      },
      {
        label: "Для инженеров",
        href: "/resheniya/dlya-inzhenerov",
      },
      {
        label: "Для службы безопасности",
        href: "/resheniya/dlya-sluzhby-bezopasnosti",
      },
    ],
  },

  {
    label: "Возможности",
    children: [
      {
        label: "Онлайн-оплата",
        href: "/vozmozhnosti/onlain-oplata",
      },
      {
        label: "Распознавание номеров",
        href: "/vozmozhnosti/raspoznavanie-nomerov",
      },
      {
        label: "Интеграции и API",
        href: "/vozmozhnosti/integracii-i-api",
      },
      {
        label: "Абонементы и RFID",
        href: "/vozmozhnosti/abonementy-i-rfid",
      },
      {
        label: "Гибкая тарификация",
        href: "/vozmozhnosti/gibkaya-tarifikaciya",
      },
    ],
  },

  {
    label: "Оборудование",
    href: "/oborudovanie",
  },

  {
    label: "Типовые комплекты",
    href: "/komplekty",
  },

  {
    label: "Кейсы",
    href: "/keysy",
  },
];
