import { MarketingSection } from "@/components/marketing/section";
import { problem } from "@/content/marketing";

/**
 * El problema en palabras del cliente. Sin iconos: la frase entre comillas, en
 * tamaño grande, hace el trabajo sola.
 */
export function Problem() {
  return (
    <MarketingSection id="problema" title={problem.title}>
      <div className="grid gap-x-10 gap-y-12 md:grid-cols-3">
        {problem.items.map((item) => (
          <div key={item.quote}>
            <p className="text-h2 text-balance">“{item.quote}”</p>
            <p className="mt-4 text-body text-ink-soft">{item.body}</p>
          </div>
        ))}
      </div>
    </MarketingSection>
  );
}
