import { Value } from "@/components/shared/value";
import { IDENTITY_KIND_LABELS } from "@/content/labels";
import type { IdentityActivity } from "@/lib/data/activity";
import { formatBytes, formatNumber } from "@/lib/utils/format";

/**
 * Quién consumió la red, con el tipo de atribución a la vista.
 *
 * En una PYME sin directorio, nueve de cada diez sesiones no traen usuario: se
 * atribuyen al nombre del equipo, a su huella o a su dirección. La etiqueta
 * junto a cada fila dice cuál de los cuatro es, porque llamar "usuario" a una
 * IP es una afirmación que el informe no puede sostener delante de un auditor.
 */
export function IdentityTable({ identities }: { identities: IdentityActivity[] }) {
  if (identities.length === 0) {
    return (
      <p className="text-small text-ink-soft">
        Todavía no hay actividad atribuida. Llega con el primer resumen de la hora en curso,
        unos minutos después de que el firewall empiece a enviar sus registros.
      </p>
    );
  }

  const max = Math.max(...identities.map((identity) => identity.bytes), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[38rem] border-collapse text-small">
        <thead>
          <tr className="border-b border-line text-micro text-ink-soft">
            <th scope="col" className="py-2 pr-3 text-left font-medium">
              Quién
            </th>
            <th scope="col" className="py-2 pr-3 text-left font-medium">
              Aplicaciones más usadas
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Sesiones
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Denegadas
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Tráfico
            </th>
          </tr>
        </thead>
        <tbody>
          {identities.map((identity) => (
            <tr key={identity.key} className="border-b border-line last:border-0 align-top">
              <td className="py-2.5 pr-3">
                <span className="block truncate font-medium">{identity.label}</span>
                <span className="mt-0.5 block text-micro text-ink-soft">
                  {IDENTITY_KIND_LABELS[identity.kind]}
                </span>
                <span className="mt-1.5 block h-1 max-w-40 overflow-hidden rounded-full bg-mist">
                  <span
                    className="block h-full rounded-full bg-signal opacity-70"
                    style={{ width: `${(identity.bytes / max) * 100}%` }}
                  />
                </span>
              </td>
              <td className="py-2.5 pr-3 text-ink-soft">
                {identity.top.length > 0
                  ? identity.top.map((entry) => entry.key).join(" · ")
                  : "—"}
              </td>
              <td className="py-2.5 pr-3 text-right">
                <Value>{formatNumber(identity.sessions)}</Value>
              </td>
              <td className="py-2.5 pr-3 text-right">
                {identity.denied > 0 ? (
                  <span className="text-sev-medium">
                    <Value>{formatNumber(identity.denied)}</Value>
                  </span>
                ) : (
                  <span className="text-ink-soft">—</span>
                )}
              </td>
              <td className="py-2.5 text-right">
                <Value>{formatBytes(identity.bytes)}</Value>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
