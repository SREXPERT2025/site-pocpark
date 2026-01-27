
import { navigation, NavItem } from '@/app/config/navigation';

export function getMainNav(): NavItem[] {
  return navigation.filter((x) => x.href);
}

export function getSolutionsByObject(): NavItem[] {
  const solutions = navigation.find((x) => x.label === 'Решения');
  const group = solutions?.groups?.find((g) => g.label === 'По объектам');
  return group?.items ?? [];
}
