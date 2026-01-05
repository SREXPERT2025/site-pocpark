import LeadFormSection from "../forms/LeadFormSection";

export default function LeadForm() {
  return (
    <section
      id="lead"
      className="bg-gradient-to-b from-slate-50 via-white to-slate-50"
    >
      <LeadFormSection minimalFields />
    </section>
  );
}
