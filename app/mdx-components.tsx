import { CtaBlock } from "@/components/ui/CtaBlock";

export function useMDXComponents(components: Record<string, any>) {
  return {
    CtaBlock,
    ...components,
  };
}
