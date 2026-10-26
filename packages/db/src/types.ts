export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          after: Json | null;
          before: Json | null;
          company_id: string | null;
          entity_id: string;
          entity_type: string;
          id: number;
          occurred_at: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          company_id?: string | null;
          entity_id: string;
          entity_type: string;
          id?: never;
          occurred_at?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          company_id?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: never;
          occurred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      cities: {
        Row: {
          created_at: string;
          iata_code: string | null;
          id: string;
          is_active: boolean;
          is_airport: boolean;
          latitude: number;
          longitude: number;
          name_ar: string;
          name_en: string;
          name_fr: string;
          region: string | null;
          served_city_id: string | null;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          iata_code?: string | null;
          id?: string;
          is_active?: boolean;
          is_airport?: boolean;
          latitude: number;
          longitude: number;
          name_ar: string;
          name_en: string;
          name_fr: string;
          region?: string | null;
          served_city_id?: string | null;
          slug: string;
        };
        Update: {
          created_at?: string;
          iata_code?: string | null;
          id?: string;
          is_active?: boolean;
          is_airport?: boolean;
          latitude?: number;
          longitude?: number;
          name_ar?: string;
          name_en?: string;
          name_fr?: string;
          region?: string | null;
          served_city_id?: string | null;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cities_served_city_id_fkey';
            columns: ['served_city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
        ];
      };
      clients: {
        Row: {
          address: string | null;
          company_id: string;
          created_at: string;
          email: string | null;
          ice: string | null;
          id: string;
          is_active: boolean;
          name: string;
          notes: string | null;
          phone: string | null;
          type: Database['public']['Enums']['client_type'];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          company_id: string;
          created_at?: string;
          email?: string | null;
          ice?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          notes?: string | null;
          phone?: string | null;
          type: Database['public']['Enums']['client_type'];
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          company_id?: string;
          created_at?: string;
          email?: string | null;
          ice?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          type?: Database['public']['Enums']['client_type'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'clients_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      companies: {
        Row: {
          address: string | null;
          city_id: string | null;
          commission_rate: number | null;
          created_at: string;
          default_vat_rate: number | null;
          ice: string | null;
          id: string;
          if_number: string | null;
          legal_name: string;
          license_expires_on: string | null;
          license_number: string | null;
          logo_path: string | null;
          marketplace_enabled: boolean;
          marketplace_suspended_at: string | null;
          marketplace_suspension_reason: string | null;
          rc_number: string | null;
          status: Database['public']['Enums']['company_status'];
          tp_number: string | null;
          trade_name: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          city_id?: string | null;
          commission_rate?: number | null;
          created_at?: string;
          default_vat_rate?: number | null;
          ice?: string | null;
          id?: string;
          if_number?: string | null;
          legal_name: string;
          license_expires_on?: string | null;
          license_number?: string | null;
          logo_path?: string | null;
          marketplace_enabled?: boolean;
          marketplace_suspended_at?: string | null;
          marketplace_suspension_reason?: string | null;
          rc_number?: string | null;
          status?: Database['public']['Enums']['company_status'];
          tp_number?: string | null;
          trade_name?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          city_id?: string | null;
          commission_rate?: number | null;
          created_at?: string;
          default_vat_rate?: number | null;
          ice?: string | null;
          id?: string;
          if_number?: string | null;
          legal_name?: string;
          license_expires_on?: string | null;
          license_number?: string | null;
          logo_path?: string | null;
          marketplace_enabled?: boolean;
          marketplace_suspended_at?: string | null;
          marketplace_suspension_reason?: string | null;
          rc_number?: string | null;
          status?: Database['public']['Enums']['company_status'];
          tp_number?: string | null;
          trade_name?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'companies_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
        ];
      };
      company_documents: {
        Row: {
          company_id: string;
          created_at: string;
          expires_on: string | null;
          id: string;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          storage_path: string;
          type: Database['public']['Enums']['document_type'];
          updated_at: string;
          verification_status: Database['public']['Enums']['verification_status'];
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          expires_on?: string | null;
          id?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          storage_path: string;
          type: Database['public']['Enums']['document_type'];
          updated_at?: string;
          verification_status?: Database['public']['Enums']['verification_status'];
        };
        Update: {
          company_id?: string;
          created_at?: string;
          expires_on?: string | null;
          id?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          storage_path?: string;
          type?: Database['public']['Enums']['document_type'];
          updated_at?: string;
          verification_status?: Database['public']['Enums']['verification_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'company_documents_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      company_members: {
        Row: {
          company_id: string;
          created_at: string;
          is_active: boolean;
          role: Database['public']['Enums']['member_role'];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          is_active?: boolean;
          role: Database['public']['Enums']['member_role'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          is_active?: boolean;
          role?: Database['public']['Enums']['member_role'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'company_members_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      credit_notes: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          invoice_id: string;
          issue_date: string;
          number: string;
          reason: string;
          subtotal_cents: number;
          total_cents: number;
          vat_cents: number;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invoice_id: string;
          issue_date: string;
          number: string;
          reason: string;
          subtotal_cents: number;
          total_cents: number;
          vat_cents: number;
          year: number;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invoice_id?: string;
          issue_date?: string;
          number?: string;
          reason?: string;
          subtotal_cents?: number;
          total_cents?: number;
          vat_cents?: number;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'credit_notes_invoice_id_company_id_fkey';
            columns: ['invoice_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'invoices';
            referencedColumns: ['id', 'company_id'];
          },
        ];
      };
      drivers: {
        Row: {
          company_id: string;
          created_at: string;
          full_name: string;
          id: string;
          languages: string[];
          license_expires_on: string;
          license_number: string;
          phone: string;
          professional_card_expires_on: string | null;
          professional_card_number: string | null;
          status: Database['public']['Enums']['driver_status'];
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          full_name: string;
          id?: string;
          languages?: string[];
          license_expires_on: string;
          license_number: string;
          phone: string;
          professional_card_expires_on?: string | null;
          professional_card_number?: string | null;
          status?: Database['public']['Enums']['driver_status'];
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          full_name?: string;
          id?: string;
          languages?: string[];
          license_expires_on?: string;
          license_number?: string;
          phone?: string;
          professional_card_expires_on?: string | null;
          professional_card_number?: string | null;
          status?: Database['public']['Enums']['driver_status'];
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'drivers_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      invoice_lines: {
        Row: {
          company_id: string;
          created_at: string;
          description: string;
          id: string;
          invoice_id: string;
          position: number;
          quantity: number;
          subtotal_cents: number;
          total_cents: number;
          trip_id: string | null;
          unit_price_cents: number;
          vat_cents: number;
          vat_rate_bps: number;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          description: string;
          id?: string;
          invoice_id: string;
          position?: number;
          quantity: number;
          subtotal_cents?: number;
          total_cents?: number;
          trip_id?: string | null;
          unit_price_cents: number;
          vat_cents?: number;
          vat_rate_bps: number;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          description?: string;
          id?: string;
          invoice_id?: string;
          position?: number;
          quantity?: number;
          subtotal_cents?: number;
          total_cents?: number;
          trip_id?: string | null;
          unit_price_cents?: number;
          vat_cents?: number;
          vat_rate_bps?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'invoice_lines_invoice_id_company_id_fkey';
            columns: ['invoice_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'invoices';
            referencedColumns: ['id', 'company_id'];
          },
          {
            foreignKeyName: 'invoice_lines_trip_id_company_id_fkey';
            columns: ['trip_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id', 'company_id'];
          },
        ];
      };
      invoices: {
        Row: {
          buyer: Json | null;
          client_id: string;
          company_id: string;
          created_at: string;
          created_by: string | null;
          due_date: string | null;
          id: string;
          issue_date: string | null;
          notes: string | null;
          number: string | null;
          paid_cents: number;
          seller: Json | null;
          status: Database['public']['Enums']['invoice_status'];
          subtotal_cents: number;
          total_cents: number;
          updated_at: string;
          vat_cents: number;
          year: number | null;
        };
        ComputedFields: never;
        Insert: {
          buyer?: Json | null;
          client_id: string;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          due_date?: string | null;
          id?: string;
          issue_date?: string | null;
          notes?: string | null;
          number?: string | null;
          paid_cents?: number;
          seller?: Json | null;
          status?: Database['public']['Enums']['invoice_status'];
          subtotal_cents?: number;
          total_cents?: number;
          updated_at?: string;
          vat_cents?: number;
          year?: number | null;
        };
        Update: {
          buyer?: Json | null;
          client_id?: string;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          due_date?: string | null;
          id?: string;
          issue_date?: string | null;
          notes?: string | null;
          number?: string | null;
          paid_cents?: number;
          seller?: Json | null;
          status?: Database['public']['Enums']['invoice_status'];
          subtotal_cents?: number;
          total_cents?: number;
          updated_at?: string;
          vat_cents?: number;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'invoices_client_id_company_id_fkey';
            columns: ['client_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id', 'company_id'];
          },
          {
            foreignKeyName: 'invoices_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          amount_cents: number;
          company_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          invoice_id: string;
          method: Database['public']['Enums']['invoice_payment_method'];
          paid_on: string;
          reference: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invoice_id: string;
          method: Database['public']['Enums']['invoice_payment_method'];
          paid_on: string;
          reference?: string | null;
        };
        Update: {
          amount_cents?: number;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invoice_id?: string;
          method?: Database['public']['Enums']['invoice_payment_method'];
          paid_on?: string;
          reference?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_invoice_id_company_id_fkey';
            columns: ['invoice_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'invoices';
            referencedColumns: ['id', 'company_id'];
          },
        ];
      };
      plan_features: {
        Row: {
          feature_key: string;
          plan_code: string;
        };
        ComputedFields: never;
        Insert: {
          feature_key: string;
          plan_code: string;
        };
        Update: {
          feature_key?: string;
          plan_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_features_plan_code_fkey';
            columns: ['plan_code'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['code'];
          },
        ];
      };
      plans: {
        Row: {
          code: string;
          monthly_price_cents: number | null;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          monthly_price_cents?: number | null;
          sort_order?: number;
        };
        Update: {
          code?: string;
          monthly_price_cents?: number | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      price_grids: {
        Row: {
          company_id: string;
          created_at: string;
          from_city_id: string;
          id: string;
          is_active: boolean;
          price_cents: number;
          to_city_id: string;
          updated_at: string;
          vehicle_type_code: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          from_city_id: string;
          id?: string;
          is_active?: boolean;
          price_cents: number;
          to_city_id: string;
          updated_at?: string;
          vehicle_type_code: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          from_city_id?: string;
          id?: string;
          is_active?: boolean;
          price_cents?: number;
          to_city_id?: string;
          updated_at?: string;
          vehicle_type_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'price_grids_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_grids_from_city_id_fkey';
            columns: ['from_city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_grids_to_city_id_fkey';
            columns: ['to_city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_grids_vehicle_type_code_fkey';
            columns: ['vehicle_type_code'];
            isOneToOne: false;
            referencedRelation: 'vehicle_types';
            referencedColumns: ['code'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          is_platform_admin: boolean;
          locale: string;
          phone: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          is_platform_admin?: boolean;
          locale?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          is_platform_admin?: boolean;
          locale?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          company_id: string;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          notes: string | null;
          past_due_since: string | null;
          payment_method: string;
          plan_code: string;
          status: Database['public']['Enums']['subscription_status'];
          trial_ends_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          notes?: string | null;
          past_due_since?: string | null;
          payment_method?: string;
          plan_code: string;
          status: Database['public']['Enums']['subscription_status'];
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          notes?: string | null;
          past_due_since?: string | null;
          payment_method?: string;
          plan_code?: string;
          status?: Database['public']['Enums']['subscription_status'];
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: true;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_plan_code_fkey';
            columns: ['plan_code'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['code'];
          },
        ];
      };
      trips: {
        Row: {
          cancel_reason: string | null;
          client_id: string | null;
          company_id: string;
          conflict_override: boolean;
          created_at: string;
          created_by: string | null;
          driver_id: string | null;
          dropoff_address: string;
          dropoff_city_id: string;
          ends_at: string;
          id: string;
          luggage: number;
          notes: string | null;
          origin: Database['public']['Enums']['trip_origin'];
          override_by: string | null;
          override_reason: string | null;
          passenger_name: string;
          passenger_phone: string | null;
          passengers: number;
          pickup_address: string;
          pickup_city_id: string;
          price_cents: number | null;
          starts_at: string;
          status: Database['public']['Enums']['trip_status'];
          updated_at: string;
          vehicle_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          cancel_reason?: string | null;
          client_id?: string | null;
          company_id: string;
          conflict_override?: boolean;
          created_at?: string;
          created_by?: string | null;
          driver_id?: string | null;
          dropoff_address: string;
          dropoff_city_id: string;
          ends_at: string;
          id?: string;
          luggage?: number;
          notes?: string | null;
          origin?: Database['public']['Enums']['trip_origin'];
          override_by?: string | null;
          override_reason?: string | null;
          passenger_name: string;
          passenger_phone?: string | null;
          passengers: number;
          pickup_address: string;
          pickup_city_id: string;
          price_cents?: number | null;
          starts_at: string;
          status?: Database['public']['Enums']['trip_status'];
          updated_at?: string;
          vehicle_id?: string | null;
        };
        Update: {
          cancel_reason?: string | null;
          client_id?: string | null;
          company_id?: string;
          conflict_override?: boolean;
          created_at?: string;
          created_by?: string | null;
          driver_id?: string | null;
          dropoff_address?: string;
          dropoff_city_id?: string;
          ends_at?: string;
          id?: string;
          luggage?: number;
          notes?: string | null;
          origin?: Database['public']['Enums']['trip_origin'];
          override_by?: string | null;
          override_reason?: string | null;
          passenger_name?: string;
          passenger_phone?: string | null;
          passengers?: number;
          pickup_address?: string;
          pickup_city_id?: string;
          price_cents?: number | null;
          starts_at?: string;
          status?: Database['public']['Enums']['trip_status'];
          updated_at?: string;
          vehicle_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'trips_client_id_company_id_fkey';
            columns: ['client_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id', 'company_id'];
          },
          {
            foreignKeyName: 'trips_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trips_driver_id_company_id_fkey';
            columns: ['driver_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'drivers';
            referencedColumns: ['id', 'company_id'];
          },
          {
            foreignKeyName: 'trips_dropoff_city_id_fkey';
            columns: ['dropoff_city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trips_pickup_city_id_fkey';
            columns: ['pickup_city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trips_vehicle_id_company_id_fkey';
            columns: ['vehicle_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id', 'company_id'];
          },
        ];
      };
      vehicle_types: {
        Row: {
          code: string;
          indicative_seats: number;
          name_ar: string;
          name_en: string;
          name_fr: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          indicative_seats: number;
          name_ar: string;
          name_en: string;
          name_fr: string;
          sort_order?: number;
        };
        Update: {
          code?: string;
          indicative_seats?: number;
          name_ar?: string;
          name_en?: string;
          name_fr?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          brand: string;
          company_id: string;
          created_at: string;
          id: string;
          luggage_capacity: number | null;
          model: string;
          registration: string;
          seats: number;
          status: Database['public']['Enums']['vehicle_status'];
          updated_at: string;
          vehicle_type_code: string;
          year: number | null;
        };
        ComputedFields: never;
        Insert: {
          brand: string;
          company_id: string;
          created_at?: string;
          id?: string;
          luggage_capacity?: number | null;
          model: string;
          registration: string;
          seats: number;
          status?: Database['public']['Enums']['vehicle_status'];
          updated_at?: string;
          vehicle_type_code: string;
          year?: number | null;
        };
        Update: {
          brand?: string;
          company_id?: string;
          created_at?: string;
          id?: string;
          luggage_capacity?: number | null;
          model?: string;
          registration?: string;
          seats?: number;
          status?: Database['public']['Enums']['vehicle_status'];
          updated_at?: string;
          vehicle_type_code?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicles_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicles_vehicle_type_code_fkey';
            columns: ['vehicle_type_code'];
            isOneToOne: false;
            referencedRelation: 'vehicle_types';
            referencedColumns: ['code'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      consume_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
      create_company: {
        Args: { p_city_id?: string; p_legal_name: string; p_trade_name?: string };
        Returns: string;
      };
      create_credit_note: { Args: { p_invoice_id: string; p_reason: string }; Returns: string };
      issue_invoice: { Args: { p_due_date?: string; p_invoice_id: string }; Returns: string };
      search_offers: {
        Args: { p_from: string; p_passengers: number; p_pickup_at: string; p_to: string };
        Returns: {
          carrier_city_id: string;
          carrier_name: string;
          company_id: string;
          max_seats: number;
          offer_id: string;
          price_cents: number;
          vehicle_type_code: string;
        }[];
      };
    };
    Enums: {
      client_type: 'b2b' | 'b2c';
      company_status: 'pending' | 'verified' | 'suspended';
      document_type: 'tourism_license' | 'insurance' | 'trade_register' | 'other';
      driver_status: 'active' | 'inactive';
      invoice_payment_method: 'bank_transfer' | 'cash' | 'cheque' | 'other';
      invoice_status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled';
      member_role: 'owner' | 'manager' | 'dispatcher' | 'accountant' | 'driver';
      subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled';
      trip_origin: 'manual' | 'marketplace';
      trip_status: 'planned' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
      vehicle_status: 'active' | 'maintenance' | 'inactive';
      verification_status: 'pending' | 'approved' | 'rejected';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      client_type: ['b2b', 'b2c'],
      company_status: ['pending', 'verified', 'suspended'],
      document_type: ['tourism_license', 'insurance', 'trade_register', 'other'],
      driver_status: ['active', 'inactive'],
      invoice_payment_method: ['bank_transfer', 'cash', 'cheque', 'other'],
      invoice_status: ['draft', 'issued', 'partially_paid', 'paid', 'cancelled'],
      member_role: ['owner', 'manager', 'dispatcher', 'accountant', 'driver'],
      subscription_status: ['trial', 'active', 'past_due', 'cancelled'],
      trip_origin: ['manual', 'marketplace'],
      trip_status: ['planned', 'assigned', 'in_progress', 'completed', 'cancelled'],
      vehicle_status: ['active', 'maintenance', 'inactive'],
      verification_status: ['pending', 'approved', 'rejected'],
    },
  },
} as const;
