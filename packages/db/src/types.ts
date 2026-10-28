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
      booking_events: {
        Row: {
          actor_id: string | null;
          booking_id: string;
          company_id: string;
          created_at: string;
          data: Json | null;
          event: string;
          id: number;
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          booking_id: string;
          company_id: string;
          created_at?: string;
          data?: Json | null;
          event: string;
          id?: never;
        };
        Update: {
          actor_id?: string | null;
          booking_id?: string;
          company_id?: string;
          created_at?: string;
          data?: Json | null;
          event?: string;
          id?: never;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_events_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      bookings: {
        Row: {
          accept_deadline: string;
          cancel_reason: string | null;
          cancellation_policy: NonNullable<Json>;
          cancelled_at: string | null;
          carrier_cents: number;
          commission_cents: number;
          commission_rate_bps: number;
          company_id: string;
          created_at: string;
          dropoff_address: string;
          flight_number: string | null;
          from_city_id: string;
          id: string;
          locale: string;
          luggage: number;
          notes: string | null;
          passengers: number;
          payment_method: Database['public']['Enums']['booking_payment_method'];
          payment_status: Database['public']['Enums']['booking_payment_status'];
          pickup_address: string;
          pickup_at: string;
          price_grid_id: string | null;
          public_ref: string;
          refund_cents: number;
          responded_at: string | null;
          status: Database['public']['Enums']['booking_status'];
          to_city_id: string;
          total_cents: number;
          traveler_email: string;
          traveler_name: string;
          traveler_phone: string;
          trip_id: string | null;
          updated_at: string;
          vehicle_type_code: string;
        };
        ComputedFields: never;
        Insert: {
          accept_deadline: string;
          cancel_reason?: string | null;
          cancellation_policy: NonNullable<Json>;
          cancelled_at?: string | null;
          carrier_cents: number;
          commission_cents: number;
          commission_rate_bps: number;
          company_id: string;
          created_at?: string;
          dropoff_address: string;
          flight_number?: string | null;
          from_city_id: string;
          id?: string;
          locale?: string;
          luggage?: number;
          notes?: string | null;
          passengers: number;
          payment_method: Database['public']['Enums']['booking_payment_method'];
          payment_status?: Database['public']['Enums']['booking_payment_status'];
          pickup_address: string;
          pickup_at: string;
          price_grid_id?: string | null;
          public_ref: string;
          refund_cents?: number;
          responded_at?: string | null;
          status?: Database['public']['Enums']['booking_status'];
          to_city_id: string;
          total_cents: number;
          traveler_email: string;
          traveler_name: string;
          traveler_phone: string;
          trip_id?: string | null;
          updated_at?: string;
          vehicle_type_code: string;
        };
        Update: {
          accept_deadline?: string;
          cancel_reason?: string | null;
          cancellation_policy?: NonNullable<Json>;
          cancelled_at?: string | null;
          carrier_cents?: number;
          commission_cents?: number;
          commission_rate_bps?: number;
          company_id?: string;
          created_at?: string;
          dropoff_address?: string;
          flight_number?: string | null;
          from_city_id?: string;
          id?: string;
          locale?: string;
          luggage?: number;
          notes?: string | null;
          passengers?: number;
          payment_method?: Database['public']['Enums']['booking_payment_method'];
          payment_status?: Database['public']['Enums']['booking_payment_status'];
          pickup_address?: string;
          pickup_at?: string;
          price_grid_id?: string | null;
          public_ref?: string;
          refund_cents?: number;
          responded_at?: string | null;
          status?: Database['public']['Enums']['booking_status'];
          to_city_id?: string;
          total_cents?: number;
          traveler_email?: string;
          traveler_name?: string;
          traveler_phone?: string;
          trip_id?: string | null;
          updated_at?: string;
          vehicle_type_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_from_city_id_fkey';
            columns: ['from_city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_price_grid_id_fkey';
            columns: ['price_grid_id'];
            isOneToOne: false;
            referencedRelation: 'price_grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_to_city_id_fkey';
            columns: ['to_city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_trip_id_company_id_fkey';
            columns: ['trip_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id', 'company_id'];
          },
          {
            foreignKeyName: 'bookings_vehicle_type_code_fkey';
            columns: ['vehicle_type_code'];
            isOneToOne: false;
            referencedRelation: 'vehicle_types';
            referencedColumns: ['code'];
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
      commission_ledger: {
        Row: {
          amount_cents: number;
          booking_id: string;
          company_id: string;
          id: string;
          kind: string;
          occurred_at: string;
          statement_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          booking_id: string;
          company_id: string;
          id?: string;
          kind: string;
          occurred_at?: string;
          statement_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          booking_id?: string;
          company_id?: string;
          id?: string;
          kind?: string;
          occurred_at?: string;
          statement_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'commission_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'commission_ledger_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'commission_ledger_statement_fk';
            columns: ['statement_id'];
            isOneToOne: false;
            referencedRelation: 'commission_statements';
            referencedColumns: ['id'];
          },
        ];
      };
      commission_statement_payments: {
        Row: {
          amount_cents: number;
          company_id: string;
          created_at: string;
          id: string;
          method: Database['public']['Enums']['statement_payment_method'];
          received_on: string;
          recorded_by: string | null;
          reference: string | null;
          statement_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          company_id: string;
          created_at?: string;
          id?: string;
          method: Database['public']['Enums']['statement_payment_method'];
          received_on: string;
          recorded_by?: string | null;
          reference?: string | null;
          statement_id: string;
        };
        Update: {
          amount_cents?: number;
          company_id?: string;
          created_at?: string;
          id?: string;
          method?: Database['public']['Enums']['statement_payment_method'];
          received_on?: string;
          recorded_by?: string | null;
          reference?: string | null;
          statement_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'commission_statement_payments_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'commission_statement_payments_statement_id_fkey';
            columns: ['statement_id'];
            isOneToOne: false;
            referencedRelation: 'commission_statements';
            referencedColumns: ['id'];
          },
        ];
      };
      commission_statements: {
        Row: {
          company_id: string;
          due_date: string;
          id: string;
          issued_at: string;
          month: string;
          paid_cents: number;
          status: Database['public']['Enums']['statement_status'];
          total_cents: number;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          due_date: string;
          id?: string;
          issued_at?: string;
          month: string;
          paid_cents?: number;
          status?: Database['public']['Enums']['statement_status'];
          total_cents: number;
        };
        Update: {
          company_id?: string;
          due_date?: string;
          id?: string;
          issued_at?: string;
          month?: string;
          paid_cents?: number;
          status?: Database['public']['Enums']['statement_status'];
          total_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'commission_statements_company_id_fkey';
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
          bank_name: string | null;
          bank_rib: string | null;
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
          bank_name?: string | null;
          bank_rib?: string | null;
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
          bank_name?: string | null;
          bank_rib?: string | null;
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
      driver_locations: {
        Row: {
          accuracy_m: number | null;
          company_id: string;
          driver_id: string;
          id: number;
          latitude: number;
          longitude: number;
          received_at: string;
          recorded_at: string;
          trip_id: string;
        };
        ComputedFields: never;
        Insert: {
          accuracy_m?: number | null;
          company_id: string;
          driver_id: string;
          id?: never;
          latitude: number;
          longitude: number;
          received_at?: string;
          recorded_at: string;
          trip_id: string;
        };
        Update: {
          accuracy_m?: number | null;
          company_id?: string;
          driver_id?: string;
          id?: never;
          latitude?: number;
          longitude?: number;
          received_at?: string;
          recorded_at?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'driver_locations_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'driver_locations_driver_id_company_id_fkey';
            columns: ['driver_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'drivers';
            referencedColumns: ['id', 'company_id'];
          },
          {
            foreignKeyName: 'driver_locations_trip_id_company_id_fkey';
            columns: ['trip_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
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
      email_outbox: {
        Row: {
          attempts: number;
          booking_id: string | null;
          created_at: string;
          id: string;
          last_error: string | null;
          locale: string;
          payload: NonNullable<Json>;
          sent_at: string | null;
          status: string;
          template: string;
          to_email: string;
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          locale?: string;
          payload?: NonNullable<Json>;
          sent_at?: string | null;
          status?: string;
          template: string;
          to_email: string;
        };
        Update: {
          attempts?: number;
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          locale?: string;
          payload?: NonNullable<Json>;
          sent_at?: string | null;
          status?: string;
          template?: string;
          to_email?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'email_outbox_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      expenses: {
        Row: {
          amount_cents: number;
          category: Database['public']['Enums']['expense_category'];
          client_ref: string | null;
          company_id: string;
          created_at: string;
          description: string | null;
          driver_id: string | null;
          id: string;
          receipt_path: string | null;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          spent_on: string;
          status: Database['public']['Enums']['expense_status'];
          submitted_by: string | null;
          trip_id: string | null;
          updated_at: string;
          vehicle_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          category: Database['public']['Enums']['expense_category'];
          client_ref?: string | null;
          company_id: string;
          created_at?: string;
          description?: string | null;
          driver_id?: string | null;
          id?: string;
          receipt_path?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          spent_on: string;
          status?: Database['public']['Enums']['expense_status'];
          submitted_by?: string | null;
          trip_id?: string | null;
          updated_at?: string;
          vehicle_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          category?: Database['public']['Enums']['expense_category'];
          client_ref?: string | null;
          company_id?: string;
          created_at?: string;
          description?: string | null;
          driver_id?: string | null;
          id?: string;
          receipt_path?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          spent_on?: string;
          status?: Database['public']['Enums']['expense_status'];
          submitted_by?: string | null;
          trip_id?: string | null;
          updated_at?: string;
          vehicle_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_driver_id_company_id_fkey';
            columns: ['driver_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'drivers';
            referencedColumns: ['id', 'company_id'];
          },
          {
            foreignKeyName: 'expenses_trip_id_company_id_fkey';
            columns: ['trip_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id', 'company_id'];
          },
          {
            foreignKeyName: 'expenses_vehicle_id_company_id_fkey';
            columns: ['vehicle_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id', 'company_id'];
          },
        ];
      };
      fuel_logs: {
        Row: {
          amount_cents: number;
          company_id: string;
          created_at: string;
          created_by: string | null;
          filled_on: string;
          full_tank: boolean;
          id: string;
          odometer_km: number;
          vehicle_id: string;
          volume_cl: number;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          filled_on: string;
          full_tank?: boolean;
          id?: string;
          odometer_km: number;
          vehicle_id: string;
          volume_cl: number;
        };
        Update: {
          amount_cents?: number;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          filled_on?: string;
          full_tank?: boolean;
          id?: string;
          odometer_km?: number;
          vehicle_id?: string;
          volume_cl?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'fuel_logs_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fuel_logs_vehicle_id_company_id_fkey';
            columns: ['vehicle_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id', 'company_id'];
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
      maintenance_parts: {
        Row: {
          company_id: string;
          id: string;
          name: string;
          quantity: number;
          record_id: string;
          unit_cost_cents: number;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          id?: string;
          name: string;
          quantity: number;
          record_id: string;
          unit_cost_cents: number;
        };
        Update: {
          company_id?: string;
          id?: string;
          name?: string;
          quantity?: number;
          record_id?: string;
          unit_cost_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_parts_record_id_company_id_fkey';
            columns: ['record_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'maintenance_records';
            referencedColumns: ['id', 'company_id'];
          },
        ];
      };
      maintenance_records: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          garage: string | null;
          id: string;
          kind: Database['public']['Enums']['maintenance_kind'];
          labour_cents: number;
          notes: string | null;
          odometer_km: number | null;
          performed_on: string;
          vehicle_id: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          garage?: string | null;
          id?: string;
          kind: Database['public']['Enums']['maintenance_kind'];
          labour_cents?: number;
          notes?: string | null;
          odometer_km?: number | null;
          performed_on: string;
          vehicle_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          garage?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['maintenance_kind'];
          labour_cents?: number;
          notes?: string | null;
          odometer_km?: number | null;
          performed_on?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_records_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_records_vehicle_id_company_id_fkey';
            columns: ['vehicle_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id', 'company_id'];
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
      quote_requests: {
        Row: {
          created_at: string;
          days: number;
          email: string;
          from_city_id: string;
          id: string;
          kind: string;
          locale: string;
          message: string;
          name: string;
          passengers: number;
          phone: string;
          start_date: string;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          days: number;
          email: string;
          from_city_id: string;
          id?: string;
          kind: string;
          locale?: string;
          message?: string;
          name: string;
          passengers: number;
          phone: string;
          start_date: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          days?: number;
          email?: string;
          from_city_id?: string;
          id?: string;
          kind?: string;
          locale?: string;
          message?: string;
          name?: string;
          passengers?: number;
          phone?: string;
          start_date?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quote_requests_from_city_id_fkey';
            columns: ['from_city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews: {
        Row: {
          booking_id: string;
          comment: string | null;
          company_id: string;
          created_at: string;
          id: string;
          moderated_at: string | null;
          moderated_by: string | null;
          rating: number;
          status: Database['public']['Enums']['review_status'];
          traveler_name: string;
        };
        ComputedFields: never;
        Insert: {
          booking_id: string;
          comment?: string | null;
          company_id: string;
          created_at?: string;
          id?: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          rating: number;
          status?: Database['public']['Enums']['review_status'];
          traveler_name: string;
        };
        Update: {
          booking_id?: string;
          comment?: string | null;
          company_id?: string;
          created_at?: string;
          id?: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          rating?: number;
          status?: Database['public']['Enums']['review_status'];
          traveler_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
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
          booking_id: string | null;
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
          booking_id?: string | null;
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
          booking_id?: string | null;
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
            foreignKeyName: 'trips_booking_fk';
            columns: ['booking_id', 'company_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id', 'company_id'];
          },
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
      vehicle_deadlines: {
        Row: {
          company_id: string;
          created_at: string;
          done_at: string | null;
          due_on: string;
          id: string;
          kind: Database['public']['Enums']['deadline_kind'];
          label: string | null;
          last_reminder_days: number | null;
          vehicle_id: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          done_at?: string | null;
          due_on: string;
          id?: string;
          kind: Database['public']['Enums']['deadline_kind'];
          label?: string | null;
          last_reminder_days?: number | null;
          vehicle_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          done_at?: string | null;
          due_on?: string;
          id?: string;
          kind?: Database['public']['Enums']['deadline_kind'];
          label?: string | null;
          last_reminder_days?: number | null;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicle_deadlines_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_deadlines_vehicle_id_company_id_fkey';
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
      admin_kpis: { Args: { p_month?: string }; Returns: Json };
      booking_notification_recipients: {
        Args: { p_company: string };
        Returns: {
          email: string;
          locale: string;
        }[];
      };
      cancel_booking_by_traveler: {
        Args: { p_booking: string; p_reason?: string };
        Returns: number;
      };
      carrier_ratings: {
        Args: { p_companies: string[] };
        Returns: {
          average: number;
          company_id: string;
          reviews: number;
        }[];
      };
      confirm_booking_payment: { Args: { p_booking: string }; Returns: undefined };
      confirm_booking_refund: { Args: { p_booking: string }; Returns: undefined };
      consume_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
      create_booking: {
        Args: {
          p_dropoff_address: string;
          p_flight_number: string;
          p_locale: string;
          p_luggage: number;
          p_notes: string;
          p_offer: string;
          p_passengers: number;
          p_payment_method: Database['public']['Enums']['booking_payment_method'];
          p_pickup_address: string;
          p_pickup_at: string;
          p_traveler_email: string;
          p_traveler_name: string;
          p_traveler_phone: string;
        };
        Returns: {
          booking_id: string;
          public_ref: string;
        }[];
      };
      create_company: {
        Args: { p_city_id?: string; p_legal_name: string; p_trade_name?: string };
        Returns: string;
      };
      create_credit_note: { Args: { p_invoice_id: string; p_reason: string }; Returns: string };
      driver_set_trip_status: {
        Args: { p_status: Database['public']['Enums']['trip_status']; p_trip: string };
        Returns: undefined;
      };
      generate_commission_statements: { Args: { p_month?: string }; Returns: number };
      issue_invoice: { Args: { p_due_date?: string; p_invoice_id: string }; Returns: string };
      live_positions: {
        Args: { p_company: string };
        Returns: {
          latitude: number;
          longitude: number;
          recorded_at: string;
          trip_id: string;
        }[];
      };
      platform_admin_emails: { Args: Record<PropertyKey, never>; Returns: string[] };
      receipt_upload_allowed: { Args: { p_company: string }; Returns: boolean };
      record_driver_locations: { Args: { p_points: Json; p_trip: string }; Returns: number };
      record_statement_payment: {
        Args: {
          p_amount_cents: number;
          p_method: Database['public']['Enums']['statement_payment_method'];
          p_received_on: string;
          p_reference?: string;
          p_statement: string;
        };
        Returns: undefined;
      };
      respond_booking: {
        Args: {
          p_accept: boolean;
          p_booking: string;
          p_duration_minutes?: number;
          p_reason?: string;
        };
        Returns: string;
      };
      route_price_overview: {
        Args: Record<PropertyKey, never>;
        Returns: {
          carriers: number;
          from_city_id: string;
          min_price_cents: number;
          to_city_id: string;
        }[];
      };
      route_prices: {
        Args: { p_from: string };
        Returns: {
          carriers: number;
          min_price_cents: number;
          to_city_id: string;
        }[];
      };
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
      submit_review: {
        Args: { p_booking: string; p_comment: string; p_rating: number };
        Returns: string;
      };
    };
    Enums: {
      booking_payment_method: 'bank_transfer' | 'cash_to_driver' | 'online_card';
      booking_payment_status: 'unpaid' | 'paid' | 'partially_refunded' | 'refunded';
      booking_status:
        | 'pending_carrier'
        | 'confirmed'
        | 'assigned'
        | 'completed'
        | 'cancelled_by_traveler'
        | 'cancelled_by_carrier'
        | 'disputed';
      client_type: 'b2b' | 'b2c';
      company_status: 'pending' | 'verified' | 'suspended';
      deadline_kind:
        'insurance' | 'technical_inspection' | 'vignette' | 'transport_authorization' | 'other';
      document_type: 'tourism_license' | 'insurance' | 'trade_register' | 'other';
      driver_status: 'active' | 'inactive';
      expense_category: 'fuel' | 'toll' | 'parking' | 'maintenance' | 'meal' | 'other';
      expense_status: 'submitted' | 'approved' | 'rejected';
      invoice_payment_method: 'bank_transfer' | 'cash' | 'cheque' | 'other';
      invoice_status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled';
      maintenance_kind: 'service' | 'repair' | 'tires' | 'inspection' | 'other';
      member_role: 'owner' | 'manager' | 'dispatcher' | 'accountant' | 'driver';
      review_status: 'pending' | 'published' | 'hidden';
      statement_payment_method: 'cash' | 'instant_transfer' | 'bank_transfer';
      statement_status: 'issued' | 'paid' | 'overdue';
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
      booking_payment_method: ['bank_transfer', 'cash_to_driver', 'online_card'],
      booking_payment_status: ['unpaid', 'paid', 'partially_refunded', 'refunded'],
      booking_status: [
        'pending_carrier',
        'confirmed',
        'assigned',
        'completed',
        'cancelled_by_traveler',
        'cancelled_by_carrier',
        'disputed',
      ],
      client_type: ['b2b', 'b2c'],
      company_status: ['pending', 'verified', 'suspended'],
      deadline_kind: [
        'insurance',
        'technical_inspection',
        'vignette',
        'transport_authorization',
        'other',
      ],
      document_type: ['tourism_license', 'insurance', 'trade_register', 'other'],
      driver_status: ['active', 'inactive'],
      expense_category: ['fuel', 'toll', 'parking', 'maintenance', 'meal', 'other'],
      expense_status: ['submitted', 'approved', 'rejected'],
      invoice_payment_method: ['bank_transfer', 'cash', 'cheque', 'other'],
      invoice_status: ['draft', 'issued', 'partially_paid', 'paid', 'cancelled'],
      maintenance_kind: ['service', 'repair', 'tires', 'inspection', 'other'],
      member_role: ['owner', 'manager', 'dispatcher', 'accountant', 'driver'],
      review_status: ['pending', 'published', 'hidden'],
      statement_payment_method: ['cash', 'instant_transfer', 'bank_transfer'],
      statement_status: ['issued', 'paid', 'overdue'],
      subscription_status: ['trial', 'active', 'past_due', 'cancelled'],
      trip_origin: ['manual', 'marketplace'],
      trip_status: ['planned', 'assigned', 'in_progress', 'completed', 'cancelled'],
      vehicle_status: ['active', 'maintenance', 'inactive'],
      verification_status: ['pending', 'approved', 'rejected'],
    },
  },
} as const;
