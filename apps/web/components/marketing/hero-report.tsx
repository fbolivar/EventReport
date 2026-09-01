import { ControlMatrix } from "@/components/app/compliance/control-matrix";
import { FindingCard } from "@/components/app/findings/finding-card";
import { PostureScore } from "@/components/app/report/posture-score";
import { Value } from "@/components/shared/value";
import { DEMO_ISO_ASSESSMENTS, DEMO_ISO_CONTROLS } from "@/lib/fixtures/compliance";
import { DEMO_FINDINGS } from "@/lib/fixtures/findings";
import { DEMO_SCORE } from "@/lib/fixtures/posture";
import { RULES_BY_CODE } from "@/lib/fixtures/rules";

/** Líneas crudas de syslog: la materia prima del informe. */
const LOG_LINES = [
  'type=traffic action=deny srcip=45.155.205.7 dstport=22 srcintf="wan1"',
  'type=event subtype=system logdesc="Admin login successful" user="admin"',
  'type=traffic action=accept policyid=14 app="Microsoft.365" sentbyte=48211',
];

const heroFinding = DEMO_FINDINGS[0];
const heroControls = DEMO_ISO_CONTROLS.slice(0, 2);

/**
 * El elemento visual del hero: un informe construido con los mismos
 * componentes del portal. Se arma en una sola secuencia al cargar —primero
 * pasan los eventos, después cuaja el informe— y no vuelve a moverse.
 */
export function HeroReport() {
  return (
    <div className="rounded-surface border border-line bg-paper shadow-pop">
      <div className="er-build er-build-1 flex items-baseline justify-between border-b border-line px-5 py-4">
        <h2 className="text-h3">Informe ejecutivo</h2>
        <Value className="text-micro text-ink-soft">agosto 2026</Value>
      </div>

      <div className="er-build er-build-1 space-y-1 overflow-hidden border-b border-line bg-mist px-5 py-3">
        {LOG_LINES.map((line, index) => (
          <p
            key={line}
            className={`er-build er-build-${index + 1} truncate text-micro text-ink-soft`}
          >
            <Value>{line}</Value>
          </p>
        ))}
      </div>

      <div className="er-build er-build-4 px-5 py-5">
        <PostureScore score={DEMO_SCORE} />
      </div>

      {heroFinding ? (
        <div className="er-build er-build-5 px-5 pb-5">
          <FindingCard
            finding={{ ...heroFinding, evidence: heroFinding.evidence.slice(0, 2) }}
            rule={RULES_BY_CODE[heroFinding.ruleCode]!}
            compact
          />
        </div>
      ) : null}

      <div className="er-build er-build-6 border-t border-line px-5 py-4">
        <p className="text-micro text-ink-soft">ISO/IEC 27001:2022 · 14 controles evaluables</p>
        <ControlMatrix
          controls={heroControls}
          assessments={DEMO_ISO_ASSESSMENTS}
          compact
          className="mt-2"
        />
      </div>
    </div>
  );
}
