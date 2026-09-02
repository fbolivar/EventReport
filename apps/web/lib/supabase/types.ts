export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      brand_benchmarks: {
        Row: {
          benchmark_version: string
          brand: Database["public"]["Enums"]["brand"]
          item_code: string
          item_title: string
          rule_code: string | null
        }
        Insert: {
          benchmark_version: string
          brand: Database["public"]["Enums"]["brand"]
          item_code: string
          item_title: string
          rule_code?: string | null
        }
        Update: {
          benchmark_version?: string
          brand?: Database["public"]["Enums"]["brand"]
          item_code?: string
          item_title?: string
          rule_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_benchmarks_rule_code_fkey"
            columns: ["rule_code"]
            isOneToOne: false
            referencedRelation: "finding_rules"
            referencedColumns: ["code"]
          },
        ]
      }
      collector_enrolments: {
        Row: {
          collector_id: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          label: string | null
          site_id: string
          tenant_id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          collector_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          label?: string | null
          site_id: string
          tenant_id: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          collector_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          label?: string | null
          site_id?: string
          tenant_id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collector_enrolments_collector_id_fkey"
            columns: ["collector_id"]
            isOneToOne: false
            referencedRelation: "collectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collector_enrolments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collector_enrolments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      collector_heartbeats: {
        Row: {
          clock_skew_seconds: number | null
          collector_id: string
          disk_free_gb: number | null
          dropped_pct: number
          eps: number
          queue_depth: number
          tenant_id: string
          ts: string
          version: string | null
        }
        Insert: {
          clock_skew_seconds?: number | null
          collector_id: string
          disk_free_gb?: number | null
          dropped_pct?: number
          eps?: number
          queue_depth?: number
          tenant_id: string
          ts: string
          version?: string | null
        }
        Update: {
          clock_skew_seconds?: number | null
          collector_id?: string
          disk_free_gb?: number | null
          dropped_pct?: number
          eps?: number
          queue_depth?: number
          tenant_id?: string
          ts?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collector_heartbeats_collector_id_fkey"
            columns: ["collector_id"]
            isOneToOne: false
            referencedRelation: "collectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collector_heartbeats_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      collectors: {
        Row: {
          config: Json
          created_at: string
          id: string
          last_seen_at: string | null
          name: string
          public_key: string | null
          site_id: string
          status: Database["public"]["Enums"]["collector_status"]
          tenant_id: string
          vault_days: number
          version: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          last_seen_at?: string | null
          name: string
          public_key?: string | null
          site_id: string
          status?: Database["public"]["Enums"]["collector_status"]
          tenant_id: string
          vault_days?: number
          version?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          last_seen_at?: string | null
          name?: string
          public_key?: string | null
          site_id?: string
          status?: Database["public"]["Enums"]["collector_status"]
          tenant_id?: string
          vault_days?: number
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collectors_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collectors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_assessments: {
        Row: {
          assessed_at: string
          control_code: string
          evidence_finding_ids: string[]
          firewall_id: string | null
          framework_code: Database["public"]["Enums"]["framework_code"]
          id: string
          justification: string | null
          justified_by: string | null
          status: Database["public"]["Enums"]["control_status"]
          tenant_id: string
        }
        Insert: {
          assessed_at?: string
          control_code: string
          evidence_finding_ids?: string[]
          firewall_id?: string | null
          framework_code: Database["public"]["Enums"]["framework_code"]
          id?: string
          justification?: string | null
          justified_by?: string | null
          status: Database["public"]["Enums"]["control_status"]
          tenant_id: string
        }
        Update: {
          assessed_at?: string
          control_code?: string
          evidence_finding_ids?: string[]
          firewall_id?: string | null
          framework_code?: Database["public"]["Enums"]["framework_code"]
          id?: string
          justification?: string | null
          justified_by?: string | null
          status?: Database["public"]["Enums"]["control_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_assessments_firewall_id_fkey"
            columns: ["firewall_id"]
            isOneToOne: false
            referencedRelation: "firewalls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_assessments_framework_code_control_code_fkey"
            columns: ["framework_code", "control_code"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["framework_code", "code"]
          },
          {
            foreignKeyName: "compliance_assessments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      config_changes: {
        Row: {
          actor: string | null
          change: Json
          created_at: string
          firewall_id: string
          from_snapshot_id: string | null
          id: string
          section: string
          tenant_id: string
          to_snapshot_id: string | null
          ts: string
        }
        Insert: {
          actor?: string | null
          change: Json
          created_at?: string
          firewall_id: string
          from_snapshot_id?: string | null
          id?: string
          section: string
          tenant_id: string
          to_snapshot_id?: string | null
          ts: string
        }
        Update: {
          actor?: string | null
          change?: Json
          created_at?: string
          firewall_id?: string
          from_snapshot_id?: string | null
          id?: string
          section?: string
          tenant_id?: string
          to_snapshot_id?: string | null
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_changes_firewall_id_fkey"
            columns: ["firewall_id"]
            isOneToOne: false
            referencedRelation: "firewalls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "config_changes_from_snapshot_id_fkey"
            columns: ["from_snapshot_id"]
            isOneToOne: false
            referencedRelation: "config_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "config_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "config_changes_to_snapshot_id_fkey"
            columns: ["to_snapshot_id"]
            isOneToOne: false
            referencedRelation: "config_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      config_snapshots: {
        Row: {
          collected_at: string
          config: Json
          created_at: string
          firewall_id: string
          id: string
          sha256: string
          tenant_id: string
        }
        Insert: {
          collected_at: string
          config: Json
          created_at?: string
          firewall_id: string
          id?: string
          sha256: string
          tenant_id: string
        }
        Update: {
          collected_at?: string
          config?: Json
          created_at?: string
          firewall_id?: string
          id?: string
          sha256?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_snapshots_firewall_id_fkey"
            columns: ["firewall_id"]
            isOneToOne: false
            referencedRelation: "firewalls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "config_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      controls: {
        Row: {
          code: string
          domain: string | null
          framework_code: Database["public"]["Enums"]["framework_code"]
          title: string
        }
        Insert: {
          code: string
          domain?: string | null
          framework_code: Database["public"]["Enums"]["framework_code"]
          title: string
        }
        Update: {
          code?: string
          domain?: string | null
          framework_code?: Database["public"]["Enums"]["framework_code"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "controls_framework_code_fkey"
            columns: ["framework_code"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["code"]
          },
        ]
      }
      critical_events: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          detail: string | null
          firewall_id: string
          id: string
          payload: Json
          rule_code: string | null
          severity: Database["public"]["Enums"]["severity"]
          tenant_id: string
          title: string
          ts: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          detail?: string | null
          firewall_id: string
          id?: string
          payload?: Json
          rule_code?: string | null
          severity: Database["public"]["Enums"]["severity"]
          tenant_id: string
          title: string
          ts: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          detail?: string | null
          firewall_id?: string
          id?: string
          payload?: Json
          rule_code?: string | null
          severity?: Database["public"]["Enums"]["severity"]
          tenant_id?: string
          title?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "critical_events_firewall_id_fkey"
            columns: ["firewall_id"]
            isOneToOne: false
            referencedRelation: "firewalls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "critical_events_rule_code_fkey"
            columns: ["rule_code"]
            isOneToOne: false
            referencedRelation: "finding_rules"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "critical_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      device_status: {
        Row: {
          cpu: number | null
          firewall_id: string
          ha_state: Database["public"]["Enums"]["ha_state"] | null
          mem: number | null
          sessions: number | null
          tenant_id: string
          ts: string
        }
        Insert: {
          cpu?: number | null
          firewall_id: string
          ha_state?: Database["public"]["Enums"]["ha_state"] | null
          mem?: number | null
          sessions?: number | null
          tenant_id: string
          ts: string
        }
        Update: {
          cpu?: number | null
          firewall_id?: string
          ha_state?: Database["public"]["Enums"]["ha_state"] | null
          mem?: number | null
          sessions?: number | null
          tenant_id?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_status_firewall_id_fkey"
            columns: ["firewall_id"]
            isOneToOne: false
            referencedRelation: "firewalls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_status_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_requests: {
        Row: {
          created_at: string
          expires_at: string
          firewall_id: string
          id: string
          query: Json
          requested_by: string | null
          result: Json | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          firewall_id: string
          id?: string
          query: Json
          requested_by?: string | null
          result?: Json | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          firewall_id?: string
          id?: string
          query?: Json
          requested_by?: string | null
          result?: Json | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_requests_firewall_id_fkey"
            columns: ["firewall_id"]
            isOneToOne: false
            referencedRelation: "firewalls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finding_rules: {
        Row: {
          code: string
          created_at: string
          description: string
          domain: Database["public"]["Enums"]["rule_domain"]
          severity: Database["public"]["Enums"]["severity"]
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          domain: Database["public"]["Enums"]["rule_domain"]
          severity: Database["public"]["Enums"]["severity"]
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          domain?: Database["public"]["Enums"]["rule_domain"]
          severity?: Database["public"]["Enums"]["severity"]
          title?: string
        }
        Relationships: []
      }
      findings: {
        Row: {
          asset_key: string
          asset_label: string
          evidence: Json
          firewall_id: string
          first_seen: string
          id: string
          justification: string | null
          last_seen: string
          resolved_at: string | null
          rule_code: string
          severity: Database["public"]["Enums"]["severity"]
          status: Database["public"]["Enums"]["finding_status"]
          tenant_id: string
        }
        Insert: {
          asset_key: string
          asset_label: string
          evidence?: Json
          firewall_id: string
          first_seen: string
          id?: string
          justification?: string | null
          last_seen: string
          resolved_at?: string | null
          rule_code: string
          severity: Database["public"]["Enums"]["severity"]
          status?: Database["public"]["Enums"]["finding_status"]
          tenant_id: string
        }
        Update: {
          asset_key?: string
          asset_label?: string
          evidence?: Json
          firewall_id?: string
          first_seen?: string
          id?: string
          justification?: string | null
          last_seen?: string
          resolved_at?: string | null
          rule_code?: string
          severity?: Database["public"]["Enums"]["severity"]
          status?: Database["public"]["Enums"]["finding_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_firewall_id_fkey"
            columns: ["firewall_id"]
            isOneToOne: false
            referencedRelation: "firewalls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_rule_code_fkey"
            columns: ["rule_code"]
            isOneToOne: false
            referencedRelation: "finding_rules"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "findings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      firewalls: {
        Row: {
          brand: Database["public"]["Enums"]["brand"]
          capabilities: Json
          collector_id: string | null
          created_at: string
          firmware: string | null
          ha_role: Database["public"]["Enums"]["ha_role"]
          hostname: string
          id: string
          model: string | null
          serial: string | null
          site_id: string
          tenant_id: string
        }
        Insert: {
          brand: Database["public"]["Enums"]["brand"]
          capabilities?: Json
          collector_id?: string | null
          created_at?: string
          firmware?: string | null
          ha_role?: Database["public"]["Enums"]["ha_role"]
          hostname: string
          id?: string
          model?: string | null
          serial?: string | null
          site_id: string
          tenant_id: string
        }
        Update: {
          brand?: Database["public"]["Enums"]["brand"]
          capabilities?: Json
          collector_id?: string | null
          created_at?: string
          firmware?: string | null
          ha_role?: Database["public"]["Enums"]["ha_role"]
          hostname?: string
          id?: string
          model?: string | null
          serial?: string | null
          site_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firewalls_collector_id_fkey"
            columns: ["collector_id"]
            isOneToOne: false
            referencedRelation: "collectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firewalls_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firewalls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      frameworks: {
        Row: {
          code: Database["public"]["Enums"]["framework_code"]
          log_retention_days: number
          name: string
          scope_note: string
          total_controls: number
          version: string
        }
        Insert: {
          code: Database["public"]["Enums"]["framework_code"]
          log_retention_days?: number
          name: string
          scope_note: string
          total_controls: number
          version: string
        }
        Update: {
          code?: Database["public"]["Enums"]["framework_code"]
          log_retention_days?: number
          name?: string
          scope_note?: string
          total_controls?: number
          version?: string
        }
        Relationships: []
      }
      posture_scores: {
        Row: {
          computed_at: string
          configuration: number
          firewall_id: string
          operation: number
          tenant_id: string
          value: number
        }
        Insert: {
          computed_at: string
          configuration: number
          firewall_id: string
          operation: number
          tenant_id: string
          value: number
        }
        Update: {
          computed_at?: string
          configuration?: number
          firewall_id?: string
          operation?: number
          tenant_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "posture_scores_firewall_id_fkey"
            columns: ["firewall_id"]
            isOneToOne: false
            referencedRelation: "firewalls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posture_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          framework_code: Database["public"]["Enums"]["framework_code"] | null
          generated_at: string | null
          id: string
          pages: number
          period_end: string
          period_start: string
          requested_by: string | null
          size_kb: number
          status: Database["public"]["Enums"]["report_status"]
          storage_path: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["report_type"]
        }
        Insert: {
          created_at?: string
          framework_code?: Database["public"]["Enums"]["framework_code"] | null
          generated_at?: string | null
          id?: string
          pages?: number
          period_end: string
          period_start: string
          requested_by?: string | null
          size_kb?: number
          status?: Database["public"]["Enums"]["report_status"]
          storage_path?: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["report_type"]
        }
        Update: {
          created_at?: string
          framework_code?: Database["public"]["Enums"]["framework_code"] | null
          generated_at?: string | null
          id?: string
          pages?: number
          period_end?: string
          period_start?: string
          requested_by?: string | null
          size_kb?: number
          status?: Database["public"]["Enums"]["report_status"]
          storage_path?: string | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["report_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rollups_hourly: {
        Row: {
          action: Database["public"]["Enums"]["event_action"]
          bytes_in: number
          bytes_out: number
          count: number
          firewall_id: string
          hour: string
          tenant_id: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          action: Database["public"]["Enums"]["event_action"]
          bytes_in?: number
          bytes_out?: number
          count?: number
          firewall_id: string
          hour: string
          tenant_id: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          action?: Database["public"]["Enums"]["event_action"]
          bytes_in?: number
          bytes_out?: number
          count?: number
          firewall_id?: string
          hour?: string
          tenant_id?: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "rollups_hourly_firewall_id_fkey"
            columns: ["firewall_id"]
            isOneToOne: false
            referencedRelation: "firewalls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rollups_hourly_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rollups_identity_hourly: {
        Row: {
          allowed: number
          bytes_in: number
          bytes_out: number
          denied: number
          firewall_id: string
          hour: string
          identity_key: string
          kind: Database["public"]["Enums"]["identity_kind"]
          label: string
          sessions: number
          tenant_id: string
        }
        Insert: {
          allowed?: number
          bytes_in?: number
          bytes_out?: number
          denied?: number
          firewall_id: string
          hour: string
          identity_key: string
          kind: Database["public"]["Enums"]["identity_kind"]
          label: string
          sessions?: number
          tenant_id: string
        }
        Update: {
          allowed?: number
          bytes_in?: number
          bytes_out?: number
          denied?: number
          firewall_id?: string
          hour?: string
          identity_key?: string
          kind?: Database["public"]["Enums"]["identity_kind"]
          label?: string
          sessions?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rollups_identity_hourly_firewall_id_fkey"
            columns: ["firewall_id"]
            isOneToOne: false
            referencedRelation: "firewalls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rollups_identity_hourly_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rollups_identity_topn: {
        Row: {
          bytes: number
          count: number
          dimension: Database["public"]["Enums"]["topn_dimension"]
          firewall_id: string
          hour: string
          identity_key: string
          key: string
          tenant_id: string
        }
        Insert: {
          bytes?: number
          count?: number
          dimension: Database["public"]["Enums"]["topn_dimension"]
          firewall_id: string
          hour: string
          identity_key: string
          key: string
          tenant_id: string
        }
        Update: {
          bytes?: number
          count?: number
          dimension?: Database["public"]["Enums"]["topn_dimension"]
          firewall_id?: string
          hour?: string
          identity_key?: string
          key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rollups_identity_topn_firewall_id_fkey"
            columns: ["firewall_id"]
            isOneToOne: false
            referencedRelation: "firewalls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rollups_identity_topn_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rollups_topn: {
        Row: {
          bytes: number
          count: number
          dimension: Database["public"]["Enums"]["topn_dimension"]
          firewall_id: string
          hour: string
          key: string
          tenant_id: string
        }
        Insert: {
          bytes?: number
          count?: number
          dimension: Database["public"]["Enums"]["topn_dimension"]
          firewall_id: string
          hour: string
          key: string
          tenant_id: string
        }
        Update: {
          bytes?: number
          count?: number
          dimension?: Database["public"]["Enums"]["topn_dimension"]
          firewall_id?: string
          hour?: string
          key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rollups_topn_firewall_id_fkey"
            columns: ["firewall_id"]
            isOneToOne: false
            referencedRelation: "firewalls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rollups_topn_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_controls: {
        Row: {
          control_code: string
          framework_code: Database["public"]["Enums"]["framework_code"]
          rule_code: string
        }
        Insert: {
          control_code: string
          framework_code: Database["public"]["Enums"]["framework_code"]
          rule_code: string
        }
        Update: {
          control_code?: string
          framework_code?: Database["public"]["Enums"]["framework_code"]
          rule_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_controls_framework_code_control_code_fkey"
            columns: ["framework_code", "control_code"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["framework_code", "code"]
          },
          {
            foreignKeyName: "rule_controls_rule_code_fkey"
            columns: ["rule_code"]
            isOneToOne: false
            referencedRelation: "finding_rules"
            referencedColumns: ["code"]
          },
        ]
      }
      rule_remediations: {
        Row: {
          brand: Database["public"]["Enums"]["brand"]
          rule_code: string
          steps: string[]
        }
        Insert: {
          brand: Database["public"]["Enums"]["brand"]
          rule_code: string
          steps: string[]
        }
        Update: {
          brand?: Database["public"]["Enums"]["brand"]
          rule_code?: string
          steps?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "rule_remediations_rule_code_fkey"
            columns: ["rule_code"]
            isOneToOne: false
            referencedRelation: "finding_rules"
            referencedColumns: ["code"]
          },
        ]
      }
      sites: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_frameworks: {
        Row: {
          activated_at: string
          framework_code: Database["public"]["Enums"]["framework_code"]
          scope_note: string | null
          tenant_id: string
        }
        Insert: {
          activated_at?: string
          framework_code: Database["public"]["Enums"]["framework_code"]
          scope_note?: string | null
          tenant_id: string
        }
        Update: {
          activated_at?: string
          framework_code?: Database["public"]["Enums"]["framework_code"]
          scope_note?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_frameworks_framework_code_fkey"
            columns: ["framework_code"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "tenant_frameworks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["member_role"]
          tenant_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          tenant_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          plan: Database["public"]["Enums"]["plan_code"]
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          plan?: Database["public"]["Enums"]["plan_code"]
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          plan?: Database["public"]["Enums"]["plan_code"]
          slug?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          metric: string
          period: string
          tenant_id: string
          value: number
        }
        Insert: {
          metric: string
          period: string
          tenant_id: string
          value?: number
        }
        Update: {
          metric?: string
          period?: string
          tenant_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_quotas: {
        Row: {
          claude_tokens_per_month: number
          config_snapshots_per_day: number
          critical_events_per_day: number
          evidence_rows: number
          firewalls: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          claude_tokens_per_month?: number
          config_snapshots_per_day?: number
          critical_events_per_day?: number
          evidence_rows?: number
          firewalls?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          claude_tokens_per_month?: number
          config_snapshots_per_day?: number
          critical_events_per_day?: number
          evidence_rows?: number
          firewalls?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_quotas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_tenant: {
        Args: {
          p_city?: string
          p_name: string
          p_plan?: Database["public"]["Enums"]["plan_code"]
          p_site?: string
          p_slug: string
        }
        Returns: string
      }
      is_tenant_admin: { Args: { p_tenant_id: string }; Returns: boolean }
      is_tenant_member: { Args: { p_tenant_id: string }; Returns: boolean }
      tenant_member_profiles:
        | {
            Args: never
            Returns: {
              email: string
              full_name: string
              id: string
              last_seen_at: string
              role: Database["public"]["Enums"]["member_role"]
              tenant_id: string
              user_id: string
            }[]
          }
        | {
            Args: { p_tenant_id?: string }
            Returns: {
              email: string
              full_name: string
              id: string
              last_seen_at: string
              role: Database["public"]["Enums"]["member_role"]
              tenant_id: string
              user_id: string
            }[]
          }
    }
    Enums: {
      brand:
        | "fortigate"
        | "sophos_xg"
        | "sonicwall"
        | "mikrotik"
        | "panos"
        | "pfsense"
        | "watchguard"
        | "cisco_asa"
        | "checkpoint"
        | "generic"
      collector_status: "active" | "measuring" | "stale" | "offline"
      control_status:
        | "compliant"
        | "non_compliant"
        | "partial"
        | "not_assessable"
        | "not_applicable"
      event_action: "allow" | "deny" | "block" | "alert"
      event_type:
        | "traffic"
        | "ips"
        | "av"
        | "web"
        | "app"
        | "vpn"
        | "admin"
        | "system"
      finding_status: "open" | "resolved" | "accepted"
      framework_code: "iso27001" | "cis_v8" | "pci_dss" | "hipaa"
      ha_role: "standalone" | "primary" | "secondary"
      ha_state: "healthy" | "degraded" | "failed"
      identity_kind: "user" | "host" | "fingerprint" | "address"
      member_role: "mssp_admin" | "client_admin" | "client_viewer"
      plan_code: "basic" | "standard" | "premium"
      report_status: "generating" | "ready" | "failed"
      report_type:
        | "executive"
        | "hardening"
        | "activity"
        | "threats"
        | "changes"
        | "compliance"
        | "critical_events"
        | "baseline"
      rule_domain:
        | "access"
        | "policy"
        | "vpn"
        | "crypto"
        | "logging"
        | "maintenance"
      severity: "critical" | "high" | "medium" | "low"
      topn_dimension:
        | "src_country"
        | "src_ip_denied"
        | "dst_ip"
        | "dst_port"
        | "app"
        | "web_category"
        | "vpn_user"
        | "ips_signature"
        | "policy"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      brand: [
        "fortigate",
        "sophos_xg",
        "sonicwall",
        "mikrotik",
        "panos",
        "pfsense",
        "watchguard",
        "cisco_asa",
        "checkpoint",
        "generic",
      ],
      collector_status: ["active", "measuring", "stale", "offline"],
      control_status: [
        "compliant",
        "non_compliant",
        "partial",
        "not_assessable",
        "not_applicable",
      ],
      event_action: ["allow", "deny", "block", "alert"],
      event_type: [
        "traffic",
        "ips",
        "av",
        "web",
        "app",
        "vpn",
        "admin",
        "system",
      ],
      finding_status: ["open", "resolved", "accepted"],
      framework_code: ["iso27001", "cis_v8", "pci_dss", "hipaa"],
      ha_role: ["standalone", "primary", "secondary"],
      ha_state: ["healthy", "degraded", "failed"],
      identity_kind: ["user", "host", "fingerprint", "address"],
      member_role: ["mssp_admin", "client_admin", "client_viewer"],
      plan_code: ["basic", "standard", "premium"],
      report_status: ["generating", "ready", "failed"],
      report_type: [
        "executive",
        "hardening",
        "activity",
        "threats",
        "changes",
        "compliance",
        "critical_events",
        "baseline",
      ],
      rule_domain: [
        "access",
        "policy",
        "vpn",
        "crypto",
        "logging",
        "maintenance",
      ],
      severity: ["critical", "high", "medium", "low"],
      topn_dimension: [
        "src_country",
        "src_ip_denied",
        "dst_ip",
        "dst_port",
        "app",
        "web_category",
        "vpn_user",
        "ips_signature",
        "policy",
      ],
    },
  },
} as const
