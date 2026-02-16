import FeaturesShowcase from '@/app/components/FeaturesShowcase';
import Hero from "@/app/components/landing/Hero";
import RoleSelector from "@/app/components/landing/RoleSelector";
import ObjectTypesSection from "@/app/components/landing/ObjectTypesSection";
import CapabilitiesSection from "@/app/components/landing/CapabilitiesSection";
import PriceList from "@/app/components/landing/PriceList";
import LeadForm from "@/app/components/landing/LeadForm";

export default function HomePage() {
  return (
    <main className="pt-0">
      <Hero />
      <div className="flex flex-col gap-24">
      <RoleSelector />
      <ObjectTypesSection />
      <CapabilitiesSection />
      <PriceList />
      <LeadForm />
      <FeaturesShowcase />
      </div>
    </main>
  );
}
