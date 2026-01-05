import Hero from "./components/landing/Hero";
import TrustNumbers from "./components/landing/TrustNumbers";
import RoleSelector from "./components/landing/RoleSelector";
import ObjectTypesSection from "./components/landing/ObjectTypesSection";
import PriceList from "./components/landing/PriceList";
import LeadForm from "./components/landing/LeadForm";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <TrustNumbers />
      <RoleSelector />
      <ObjectTypesSection />
      <PriceList />
      <LeadForm />
    </main>
  );
}
