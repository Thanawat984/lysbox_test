export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      accountants: {
        Row: {
          crc: string | null
          crc_status: Database["public"]["Enums"]["crc_status"]
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          crc?: string | null
          crc_status?: Database["public"]["Enums"]["crc_status"]
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          crc?: string | null
          crc_status?: Database["public"]["Enums"]["crc_status"]
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      accounting_transactions: {
        Row: {
          amount_cents: number
          category: string | null
          company_id: string
          created_at: string
          date: string
          description: string | null
          file_id: string | null
          id: string
          status: Database["public"]["Enums"]["acc_payment_status"]
          type: Database["public"]["Enums"]["acc_transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          category?: string | null
          company_id: string
          created_at?: string
          date: string
          description?: string | null
          file_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["acc_payment_status"]
          type: Database["public"]["Enums"]["acc_transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          category?: string | null
          company_id?: string
          created_at?: string
          date?: string
          description?: string | null
          file_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["acc_payment_status"]
          type?: Database["public"]["Enums"]["acc_transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_classifications: {
        Row: {
          competencia_month: number
          competencia_year: number
          confidence: number | null
          created_at: string
          doc_type: Database["public"]["Enums"]["ai_doc_type"]
          file_id: string
          id: string
        }
        Insert: {
          competencia_month: number
          competencia_year: number
          confidence?: number | null
          created_at?: string
          doc_type: Database["public"]["Enums"]["ai_doc_type"]
          file_id: string
          id?: string
        }
        Update: {
          competencia_month?: number
          competencia_year?: number
          confidence?: number | null
          created_at?: string
          doc_type?: Database["public"]["Enums"]["ai_doc_type"]
          file_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_classifications_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          channel: Database["public"]["Enums"]["alert_channel"]
          company_id: string
          created_at: string
          id: string
          payload: Json
          scheduled_for: string | null
          status: Database["public"]["Enums"]["queue_status"]
          template_code: string
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["alert_channel"]
          company_id: string
          created_at?: string
          id?: string
          payload?: Json
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          template_code: string
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["alert_channel"]
          company_id?: string
          created_at?: string
          id?: string
          payload?: Json
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          template_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          action_code: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          reason: string | null
          requested_by: string
          status: Database["public"]["Enums"]["approval_status"]
          window_minutes: number | null
        }
        Insert: {
          action_code: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_by: string
          status?: Database["public"]["Enums"]["approval_status"]
          window_minutes?: number | null
        }
        Update: {
          action_code?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_by?: string
          status?: Database["public"]["Enums"]["approval_status"]
          window_minutes?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          diff: Json | null
          entity: string
          entity_id: string | null
          hash_curr: string | null
          hash_prev: string | null
          id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          diff?: Json | null
          entity: string
          entity_id?: string | null
          hash_curr?: string | null
          hash_prev?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          diff?: Json | null
          entity?: string
          entity_id?: string | null
          hash_curr?: string | null
          hash_prev?: string | null
          id?: string
        }
        Relationships: []
      }
      buckets: {
        Row: {
          id: string
          created_at: string
          name: string
          owner_id: string
          type: Database["public"]["Enums"]["bucket_type"]
          total_size: number
          limit_size: number
          public: boolean
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          owner_id: string
          type?: Database["public"]["Enums"]["bucket_type"]
          total_size?: number
          limit_size?: number
          public: boolean
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          owner_id?: string
          type?: Database["public"]["Enums"]["bucket_type"]
          total_size?: number
          limit_size?: number
          public?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          company_id: string
          created_at: string
          due_date: string
          id: string
          obligation_id: string | null
          referencia: string
          status: Database["public"]["Enums"]["calendar_status"]
        }
        Insert: {
          company_id: string
          created_at?: string
          due_date: string
          id?: string
          obligation_id?: string | null
          referencia: string
          status?: Database["public"]["Enums"]["calendar_status"]
        }
        Update: {
          company_id?: string
          created_at?: string
          due_date?: string
          id?: string
          obligation_id?: string | null
          referencia?: string
          status?: Database["public"]["Enums"]["calendar_status"]
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "tax_obligations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_accountant_link: {
        Row: {
          accountant_id: string
          company_id: string
          created_at: string
          id: string
          is_primary: boolean
        }
        Insert: {
          accountant_id: string
          company_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
        }
        Update: {
          accountant_id?: string
          company_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "client_accountant_link_accountant_id_fkey"
            columns: ["accountant_id"]
            isOneToOne: false
            referencedRelation: "accountants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_accountant_link_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_favorites: {
        Row: {
          created_at: string
          file_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloud_favorites_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "cloud_files"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_files: {
        Row: {
          bucket: string
          created_at: string
          deleted_at: string | null
          id: string
          mime_type: string | null
          name: string
          original_path: string | null
          path: string
          size_bytes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          mime_type?: string | null
          name: string
          original_path?: string | null
          path: string
          size_bytes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bucket?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          original_path?: string | null
          path?: string
          size_bytes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          cnpj: string
          created_at: string
          id: string
          nome_fantasia: string | null
          owner_user_id: string
          razao_social: string
          regime: Database["public"]["Enums"]["regime_tributario"]
          updated_at: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          id?: string
          nome_fantasia?: string | null
          owner_user_id: string
          razao_social: string
          regime: Database["public"]["Enums"]["regime_tributario"]
          updated_at?: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          id?: string
          nome_fantasia?: string | null
          owner_user_id?: string
          razao_social?: string
          regime?: Database["public"]["Enums"]["regime_tributario"]
          updated_at?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          body_html: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["queue_status"]
          subject: string
          to_email: string
        }
        Insert: {
          body_html: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["queue_status"]
          subject: string
          to_email: string
        }
        Update: {
          body_html?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["queue_status"]
          subject?: string
          to_email?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          approved: boolean
          created_at: string
          id: string
          order: number | null
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          approved?: boolean
          created_at?: string
          id?: string
          order?: number | null
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          approved?: boolean
          created_at?: string
          id?: string
          order?: number | null
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      file_blobs: {
        Row: {
          content: string
          file_id: string
        }
        Insert: {
          content: string
          file_id: string
        }
        Update: {
          content?: string
          file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_blobs_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: true
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      file_tags: {
        Row: {
          file_id: string
          id: string
          key: string
          value: string | null
        }
        Insert: {
          file_id: string
          id?: string
          key: string
          value?: string | null
        }
        Update: {
          file_id?: string
          id?: string
          key?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_tags_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      file_versions: {
        Row: {
          created_at: string
          file_id: string
          hash_sha256: string | null
          id: string
          size_bytes: number | null
          version: number
        }
        Insert: {
          created_at?: string
          file_id: string
          hash_sha256?: string | null
          id?: string
          size_bytes?: number | null
          version: number
        }
        Update: {
          created_at?: string
          file_id?: string
          hash_sha256?: string | null
          id?: string
          size_bytes?: number | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          bucket_id: string
          company_id: string | null
          created_at: string
          deleted_at: string | null
          filename: string
          hash_sha256: string | null
          id: string
          mime_type: string | null
          owner_user_id: string
          path: string
          size_bytes: number
        }
        Insert: {
          bucket_id: string
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          filename: string
          hash_sha256?: string | null
          id?: string
          mime_type?: string | null
          owner_user_id: string
          path: string
          size_bytes: number
        }
        Update: {
          bucket_id?: string
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          filename?: string
          hash_sha256?: string | null
          id?: string
          mime_type?: string | null
          owner_user_id?: string
          path?: string
          size_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "files_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          provider: Database["public"]["Enums"]["integration_provider"]
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          provider: Database["public"]["Enums"]["integration_provider"]
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          provider?: Database["public"]["Enums"]["integration_provider"]
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_cents: number
          created_at: string
          due_date: string | null
          id: string
          paid_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subscription_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          due_date?: string | null
          id?: string
          paid_at?: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subscription_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          due_date?: string | null
          id?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      iva_operations: {
        Row: {
          amount_without_tax: number
          cbs_rate: number
          company_id: string
          created_at: string
          credit_debit: Database["public"]["Enums"]["iva_credit_debit"]
          file_id: string | null
          ibs_rate: number
          id: string
          iva_total: number
          notes: string | null
          op_date: string
          op_type: Database["public"]["Enums"]["iva_operation_type"]
          party_cnpj: string | null
          party_name: string | null
          source: Database["public"]["Enums"]["iva_source"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_without_tax: number
          cbs_rate: number
          company_id: string
          created_at?: string
          credit_debit: Database["public"]["Enums"]["iva_credit_debit"]
          file_id?: string | null
          ibs_rate: number
          id?: string
          iva_total: number
          notes?: string | null
          op_date: string
          op_type: Database["public"]["Enums"]["iva_operation_type"]
          party_cnpj?: string | null
          party_name?: string | null
          source?: Database["public"]["Enums"]["iva_source"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_without_tax?: number
          cbs_rate?: number
          company_id?: string
          created_at?: string
          credit_debit?: Database["public"]["Enums"]["iva_credit_debit"]
          file_id?: string | null
          ibs_rate?: number
          id?: string
          iva_total?: number
          notes?: string | null
          op_date?: string
          op_type?: Database["public"]["Enums"]["iva_operation_type"]
          party_cnpj?: string | null
          party_name?: string | null
          source?: Database["public"]["Enums"]["iva_source"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      iva_parameters: {
        Row: {
          active_from: string
          active_to: string | null
          cbs_rate: number
          created_at: string
          description: string | null
          enabled: boolean
          ibs_rate: number
          id: string
          regime: Database["public"]["Enums"]["iva_special_regime"]
          sector: Database["public"]["Enums"]["iva_sector"]
          updated_at: string
        }
        Insert: {
          active_from?: string
          active_to?: string | null
          cbs_rate: number
          created_at?: string
          description?: string | null
          enabled?: boolean
          ibs_rate: number
          id?: string
          regime?: Database["public"]["Enums"]["iva_special_regime"]
          sector?: Database["public"]["Enums"]["iva_sector"]
          updated_at?: string
        }
        Update: {
          active_from?: string
          active_to?: string | null
          cbs_rate?: number
          created_at?: string
          description?: string | null
          enabled?: boolean
          ibs_rate?: number
          id?: string
          regime?: Database["public"]["Enums"]["iva_special_regime"]
          sector?: Database["public"]["Enums"]["iva_sector"]
          updated_at?: string
        }
        Relationships: []
      }
      jit_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          reason: string | null
          role_code: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          reason?: string | null
          role_code: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          reason?: string | null
          role_code?: string
          user_id?: string
        }
        Relationships: []
      }
      kpis: {
        Row: {
          created_at: string
          id: string
          label: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      logos: {
        Row: {
          alt: string | null
          approved: boolean
          created_at: string
          id: string
          order: number | null
          updated_at: string
          url: string
        }
        Insert: {
          alt?: string | null
          approved?: boolean
          created_at?: string
          id?: string
          order?: number | null
          updated_at?: string
          url: string
        }
        Update: {
          alt?: string | null
          approved?: boolean
          created_at?: string
          id?: string
          order?: number | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      ocr_jobs: {
        Row: {
          created_at: string
          engine: Database["public"]["Enums"]["ocr_engine"]
          file_id: string
          finished_at: string | null
          id: string
          payload: Json
          status: Database["public"]["Enums"]["ocr_status"]
        }
        Insert: {
          created_at?: string
          engine?: Database["public"]["Enums"]["ocr_engine"]
          file_id: string
          finished_at?: string | null
          id?: string
          payload?: Json
          status?: Database["public"]["Enums"]["ocr_status"]
        }
        Update: {
          created_at?: string
          engine?: Database["public"]["Enums"]["ocr_engine"]
          file_id?: string
          finished_at?: string | null
          id?: string
          payload?: Json
          status?: Database["public"]["Enums"]["ocr_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ocr_jobs_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          invoice_id: string
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_charge_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          invoice_id: string
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_charge_id?: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          invoice_id?: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_charge_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          code: string
          created_at: string
          demo_duration_days: number | null
          features: Json
          id: string
          is_demo: boolean
          monthly_price_cents: number
          name: string
          storage_gb: number
          tier: Database["public"]["Enums"]["plan_tier"]
          yearly_price_cents: number | null
        }
        Insert: {
          code: string
          created_at?: string
          demo_duration_days?: number | null
          features?: Json
          id?: string
          is_demo?: boolean
          monthly_price_cents: number
          name: string
          storage_gb: number
          tier: Database["public"]["Enums"]["plan_tier"]
          yearly_price_cents?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          demo_duration_days?: number | null
          features?: Json
          id?: string
          is_demo?: boolean
          monthly_price_cents?: number
          name?: string
          storage_gb?: number
          tier?: Database["public"]["Enums"]["plan_tier"]
          yearly_price_cents?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          state: number | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          state?: number | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          state?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean
          button_label: string | null
          created_at: string
          id: string
          text: string
          updated_at: string
          url: string | null
        }
        Insert: {
          active: boolean
          button_label?: string | null
          created_at?: string
          id?: string
          text: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          active?: boolean
          button_label?: string | null
          created_at?: string
          id?: string
          text?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      rbac_permissions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      rbac_role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "rbac_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      rbac_user_roles: {
        Row: {
          created_at: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          details: Json
          id: string
          type: Database["public"]["Enums"]["security_event_type"]
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          type: Database["public"]["Enums"]["security_event_type"]
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          type?: Database["public"]["Enums"]["security_event_type"]
        }
        Relationships: []
      }
      share_access_logs: {
        Row: {
          created_at: string
          event: string
          geo: Json | null
          id: string
          ip: unknown | null
          share_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          geo?: Json | null
          id?: string
          ip?: unknown | null
          share_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          geo?: Json | null
          id?: string
          ip?: unknown | null
          share_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_access_logs_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
        ]
      }
      share_files: {
        Row: {
          created_at: string
          file_id: string
          id: string
          share_id: string
        }
        Insert: {
          created_at?: string
          file_id: string
          id?: string
          share_id: string
        }
        Update: {
          created_at?: string
          file_id?: string
          id?: string
          share_id?: string
        }
        Relationships: []
      }
      shares: {
        Row: {
          allow_download: boolean
          allow_upload: boolean
          anti_print: boolean
          downloads_count: number
          expires_at: string | null
          id: string
          max_downloads: number | null
          owner_user_id: string
          password_hash: string | null
          status: Database["public"]["Enums"]["share_status"]
          watermark: boolean
        }
        Insert: {
          allow_download?: boolean
          allow_upload?: boolean
          anti_print?: boolean
          downloads_count?: number
          expires_at?: string | null
          id?: string
          max_downloads?: number | null
          owner_user_id: string
          password_hash?: string | null
          status?: Database["public"]["Enums"]["share_status"]
          watermark?: boolean
        }
        Update: {
          allow_download?: boolean
          allow_upload?: boolean
          anti_print?: boolean
          downloads_count?: number
          expires_at?: string | null
          id?: string
          max_downloads?: number | null
          owner_user_id?: string
          password_hash?: string | null
          status?: Database["public"]["Enums"]["share_status"]
          watermark?: boolean
        }
        Relationships: []
      }
      site_content: {
        Row: {
          content: Json
          created_at: string
          id: string
          key: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          key: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value_json: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value_json?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value_json?: Json
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_documents: {
        Row: {
          company_id: string
          competencia_month: number
          competencia_year: number
          created_at: string
          file_id: string
          id: string
          status: Database["public"]["Enums"]["tax_status"]
          tipo: Database["public"]["Enums"]["tax_tipo"]
          valor_centavos: number | null
        }
        Insert: {
          company_id: string
          competencia_month: number
          competencia_year: number
          created_at?: string
          file_id: string
          id?: string
          status: Database["public"]["Enums"]["tax_status"]
          tipo: Database["public"]["Enums"]["tax_tipo"]
          valor_centavos?: number | null
        }
        Update: {
          company_id?: string
          competencia_month?: number
          competencia_year?: number
          created_at?: string
          file_id?: string
          id?: string
          status?: Database["public"]["Enums"]["tax_status"]
          tipo?: Database["public"]["Enums"]["tax_tipo"]
          valor_centavos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_documents_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_obligations: {
        Row: {
          ativo: boolean
          id: string
          regime: Database["public"]["Enums"]["regime_tributario"]
          regra_vencimento: Json
          tipo: Database["public"]["Enums"]["tax_tipo"]
        }
        Insert: {
          ativo?: boolean
          id?: string
          regime: Database["public"]["Enums"]["regime_tributario"]
          regra_vencimento: Json
          tipo: Database["public"]["Enums"]["tax_tipo"]
        }
        Update: {
          ativo?: boolean
          id?: string
          regime?: Database["public"]["Enums"]["regime_tributario"]
          regra_vencimento?: Json
          tipo?: Database["public"]["Enums"]["tax_tipo"]
        }
        Relationships: []
      }
      telemetry_events: {
        Row: {
          actor_user_id: string | null
          button_id: string
          correlation_id: string
          created_at: string
          id: string
          metadata: Json
          outcome: Database["public"]["Enums"]["telemetry_outcome"]
        }
        Insert: {
          actor_user_id?: string | null
          button_id: string
          correlation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          outcome: Database["public"]["Enums"]["telemetry_outcome"]
        }
        Update: {
          actor_user_id?: string | null
          button_id?: string
          correlation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          outcome?: Database["public"]["Enums"]["telemetry_outcome"]
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          approved: boolean
          author: string
          created_at: string
          id: string
          quote: string
          rating: number
          role: string | null
          updated_at: string
        }
        Insert: {
          approved?: boolean
          author: string
          created_at?: string
          id?: string
          quote: string
          rating?: number
          role?: string | null
          updated_at?: string
        }
        Update: {
          approved?: boolean
          author?: string
          created_at?: string
          id?: string
          quote?: string
          rating?: number
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          context: string
          created_at: string
          id: string
          internal: boolean
          sender_id: string
          ticket_id: string
          type: Database["public"]["Enums"]["ticket_type"]
        }
        Insert: {
          context: string
          created_at?: string
          id?: string
          internal?: boolean
          sender_id: string
          ticket_id: string
          type: Database["public"]["Enums"]["ticket_type"]
        }
        Update: {
          context?: string
          created_at?: string
          id?: string
          internal?: boolean
          sender_id?: string
          ticket_id?: string
          type?: Database["public"]["Enums"]["ticket_type"]
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          company_id: string
          created_at: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          support_at: string
          update_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          support_at: string
          update_at: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          support_at?: string
          update_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          created_at: string
          enabled: boolean
          event_codes: string[]
          id: string
          secret: string | null
          url: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          event_codes?: string[]
          id?: string
          secret?: string | null
          url: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          event_codes?: string[]
          id?: string
          secret?: string | null
          url?: string
        }
        Relationships: []
      }
      whatsapp_queue: {
        Row: {
          created_at: string
          id: string
          payload: Json
          status: Database["public"]["Enums"]["queue_status"]
          template: string
          to_phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          status?: Database["public"]["Enums"]["queue_status"]
          template: string
          to_phone: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          status?: Database["public"]["Enums"]["queue_status"]
          template?: string
          to_phone?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_monthly_financial_summary: {
        Row: {
          company_id: string | null
          despesas_cents: number | null
          month: string | null
          receitas_cents: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      fn_audit_log: {
        Args: {
          p_entity: string
          p_entity_id: string
          p_action: string
          p_diff: Json
        }
        Returns: undefined
      }
      get_auth_user_email: {
        Args: { uid: string }
        Returns: {
          id: string
          email: string
        }[]
      }
      get_effective_permissions: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      has_permission: {
        Args: { _user: string; _perm_code: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_linked_accountant: {
        Args: { _user: string; _company: string }
        Returns: boolean
      }
      jwt_roles: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      rbac_has_role: {
        Args: { _user: string; _role_code: string }
        Returns: boolean
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      get_user_profile: { 
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          email: string | null
          full_name: string | null
          roles: string | null
        }
    }
    }
    Enums: {
      acc_payment_status: "pago" | "pendente" | "cancelado"
      acc_transaction_type: "receita" | "despesa"
      ai_doc_type: "nf" | "das" | "recibo" | "folha" | "outros"
      alert_channel: "painel" | "email" | "whatsapp"
      app_role: "empresario" | "contador" | "admin" | "super_admin"
      approval_status: "pendente" | "aprovado" | "rejeitado"
      bucket_provider: "s3" | "wasabi" | "backblaze" | "supabase"
      bucket_type: "nuvem" | "contabilidade" | "temporário"
      calendar_status: "previsto" | "enviado" | "pago" | "atrasado"
      crc_status: "pendente" | "validado" | "recusado"
      integration_provider:
        | "openai"
        | "ocr"
        | "whatsapp"
        | "email_smtp"
        | "payment"
      invoice_status: "open" | "paid" | "void" | "refunded"
      iva_credit_debit: "credito" | "debito"
      iva_operation_type: "compra" | "venda"
      iva_sector:
        | "geral"
        | "saude"
        | "educacao"
        | "transporte_coletivo"
        | "cesta_basica"
      iva_source: "manual" | "ocr"
      iva_special_regime:
        | "padrao"
        | "combustiveis"
        | "financeiros"
        | "planos_saude"
        | "agropecuaria"
      ocr_engine: "tesseract" | "vision"
      ocr_status: "queued" | "processing" | "done" | "error"
      payment_provider: "mercadopago" | "stripe"
      payment_status: "succeeded" | "failed"
      plan_tier:
        | "gratuito"
        | "essencial"
        | "pro"
        | "ultra"
        | "contabil"
        | "contador_prof"
        | "contador_avancado"
      queue_status: "queued" | "sent" | "error"
      regime_tributario: "mei" | "simples" | "lucro_presumido" | "lucro_real"
      security_event_type:
        | "login_fail"
        | "bruteforce"
        | "mass_download"
        | "jit_activate"
      share_status: "ativo" | "revogado" | "expirado"
      share_visibility: "private" | "password" | "public_restricted"
      subscription_status: "trial" | "active" | "past_due" | "canceled"
      tax_status: "pago" | "pendente"
      tax_tipo: "DAS" | "DCTF" | "FGTS" | "IRPJ" | "NF" | "RECIBO" | "FOLHA"
      telemetry_outcome: "success" | "error"
      ticket_channel: "painel" | "email" | "whatsapp" | "manual"
      ticket_priority: "baixa" | "normal" | "alta" | "crítica"
      ticket_status: "aberto" | "pendente" | "fechado" | "aguardando" | "resolvido"
      ticket_type: "mensagem" | "anexo" | "status" | "interno"
      watermark_mode: "off" | "visible" | "invisible" | "dynamic"
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
      acc_payment_status: ["pago", "pendente", "cancelado"],
      acc_transaction_type: ["receita", "despesa"],
      ai_doc_type: ["nf", "das", "recibo", "folha", "outros"],
      alert_channel: ["painel", "email", "whatsapp"],
      app_role: ["empresario", "contador", "admin", "super_admin"],
      approval_status: ["pendente", "aprovado", "rejeitado"],
      bucket_type: ["nuvem", "contabilidade", "temporário"],
      calendar_status: ["previsto", "enviado", "pago", "atrasado"],
      crc_status: ["pendente", "validado", "recusado"],
      integration_provider: [
        "openai",
        "ocr",
        "whatsapp",
        "email_smtp",
        "payment",
      ],
      invoice_status: ["open", "paid", "void", "refunded"],
      iva_credit_debit: ["credito", "debito"],
      iva_operation_type: ["compra", "venda"],
      iva_sector: [
        "geral",
        "saude",
        "educacao",
        "transporte_coletivo",
        "cesta_basica",
      ],
      iva_source: ["manual", "ocr"],
      iva_special_regime: [
        "padrao",
        "combustiveis",
        "financeiros",
        "planos_saude",
        "agropecuaria",
      ],
      ocr_engine: ["tesseract", "vision"],
      ocr_status: ["queued", "processing", "done", "error"],
      payment_provider: ["mercadopago", "stripe"],
      payment_status: ["succeeded", "failed"],
      plan_tier: [
        "gratuito",
        "essencial",
        "pro",
        "ultra",
        "contabil",
        "contador_prof",
        "contador_avancado",
      ],
      queue_status: ["queued", "sent", "error"],
      regime_tributario: ["mei", "simples", "lucro_presumido", "lucro_real"],
      security_event_type: [
        "login_fail",
        "bruteforce",
        "mass_download",
        "jit_activate",
      ],
      share_status: ["ativo", "revogado", "expirado"],
      share_visibility: ["private", "password", "public_restricted"],
      subscription_status: ["trial", "active", "past_due", "canceled"],
      tax_status: ["pago", "pendente"],
      tax_tipo: ["DAS", "DCTF", "FGTS", "IRPJ", "NF", "RECIBO", "FOLHA"],
      telemetry_outcome: ["success", "error"],
      ticket_channel: ["painel", "email", "whatsapp", "manual"],
      ticket_priority: ["baixa", "normal", "alta", "crítica"],
      ticket_status: ["aberto", "pendente", "fechado", "aguardando", "resolvido"],
      ticket_type:  ["mensagem" , "anexo" , "status" , "interno"],
      watermark_mode: ["off", "visible", "invisible", "dynamic"],
    },
  },
} as const
