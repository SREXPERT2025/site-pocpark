import FeaturesShowcase from '@/app/components/FeaturesShowcase';
import Hero from "./components/landing/Hero";
import TrustNumbers from "./components/landing/TrustNumbers";
import RoleSelector from "./components/landing/RoleSelector";
import ObjectTypesSection from "./components/landing/ObjectTypesSection";
import CapabilitiesSection from "./components/landing/CapabilitiesSection";
import PriceList from "./components/landing/PriceList";
import LeadForm from "./components/landing/LeadForm";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <TrustNumbers />
      <RoleSelector />
      <ObjectTypesSection />
      <CapabilitiesSection />
      <PriceList />
      <LeadForm />
      <FeaturesShowcase />
</main>
  );
}
