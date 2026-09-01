import { cache } from "react";
import type { ChangeKind, ChangeSection } from "@eventreport/rules";

import { createClient } from "@/lib/supabase/server";

/**
 * Cambios de configuración detectados entre snapshots (§8).
 *
 * Los produce `ingest-config` comparando cada snapshot con el anterior; aquí
 * solo se leen. El `actor` viene del syslog de administración cuando existe:
 * un cambio sin autor es exactamente lo que cuenta la regla OP-004.
 */
export interface ConfigChangeRow {
  id: string;
  firewallId: string;
  section: ChangeSection;
  kind: ChangeKind;
  target: string;
  fields: Array<{ field: string; before: string; after: string }>;
  actor?: string;
  ts: string;
}

export const listConfigChanges = cache(
  async (since: string, until: string): Promise<ConfigChangeRow[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("config_changes")
      .select("id, firewall_id, section, change, actor, ts")
      .gte("ts", since)
      .lte("ts", until)
      .order("ts", { ascending: false });

    return (data ?? []).map((row) => {
      const change = row.change as {
        kind: ChangeKind;
        target: string;
        fields: Array<{ field: string; before: string; after: string }>;
      };

      return {
        id: row.id,
        firewallId: row.firewall_id,
        section: row.section as ChangeSection,
        kind: change.kind,
        target: change.target,
        fields: change.fields ?? [],
        actor: row.actor ?? undefined,
        ts: row.ts,
      };
    });
  },
);
