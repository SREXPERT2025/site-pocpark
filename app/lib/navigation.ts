
import { navigation, NavItem, NavLink } from '@/app/config/navigation';

export function getMainNav(): NavItem[] {
  return navigation.filter((x) => x.href);
}

export function getSolutionsByObject(): NavLink[] {
  const solutions = navigation.find((x) => x.label === 'Решения');
  const group = solutions?.groups?.find((g) => g.label === 'По объектам');
  return group?.items ?? [];
}

export function getSolutionsFooterLinks(): NavLink[] {
  const solutions = navigation.find((x) => x.label === 'Решения');
  const objectLinks = solutions?.groups?.find((g) => g.label === 'По объектам')?.items ?? [];
  const processLinks = solutions?.groups?.find((g) => g.label === 'Процесс')?.items ?? [];

  return [...objectLinks, ...processLinks];
}
