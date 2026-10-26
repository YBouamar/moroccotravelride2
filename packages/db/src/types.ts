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
    };
    Enums: {
      client_type: 'b2b' | 'b2c';
      company_status: 'pending' | 'verified' | 'suspended';
      document_type: 'tourism_license' | 'insurance' | 'trade_register' | 'other';
      driver_status: 'active' | 'inactive';
      member_role: 'owner' | 'manager' | 'dispatcher' | 'accountant' | 'driver';
      subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled';
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
      member_role: ['owner', 'manager', 'dispatcher', 'accountant', 'driver'],
      subscription_status: ['trial', 'active', 'past_due', 'cancelled'],
      vehicle_status: ['active', 'maintenance', 'inactive'],
      verification_status: ['pending', 'approved', 'rejected'],
    },
  },
} as const;
