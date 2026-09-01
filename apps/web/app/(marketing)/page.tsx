import type { Metadata } from "next";

import { Brands } from "@/components/marketing/brands";
import { Compliance } from "@/components/marketing/compliance";
import { DataResidency } from "@/components/marketing/data-residency";
import { Deliverables } from "@/components/marketing/deliverables";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Pricing } from "@/components/marketing/pricing";
import { Problem } from "@/components/marketing/problem";

export const metadata: Metadata = {
  description:
    "Informes ejecutivos, técnicos y de cumplimiento a partir de la configuración y los registros de tu firewall. Sin FortiAnalyzer, sin SIEM y sin que tus registros salgan de tu red.",
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <Deliverables />
      <Compliance />
      <Brands />
      <DataResidency />
      <Pricing />
      <FinalCta />
    </>
  );
}
