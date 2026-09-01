/**
 * Placeholder for block 1 (scaffold). The commercial landing is built in
 * block 3 from components/marketing + content/marketing.ts.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-marketing flex-col justify-center px-6 py-24">
      <p className="text-micro text-ink-soft">Bloque 1 · andamiaje del monorepo</p>
      <h1 className="mt-4 text-display">EventReport</h1>
      <p className="mt-6 max-w-prose text-body text-ink-soft">
        Informes ejecutivos, técnicos y de cumplimiento a partir de los logs y la configuración de
        tu firewall. La landing y el portal llegan en los bloques siguientes.
      </p>
      <p className="mt-10 text-small text-ink-soft">
        Tokens activos:{" "}
        <span className="value text-signal">--er-signal #0E5FD8</span> ·{" "}
        <span className="value text-critical">--er-sev-critical #B3261E</span> ·{" "}
        <span className="value text-resolved">--er-sev-resolved #0F766E</span>
      </p>
    </main>
  );
}
