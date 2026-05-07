/**
 * Supabase database types (manually defined to match migration 001).
 * In production, these should be auto-generated via `supabase gen types typescript`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      funnels: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: 'draft' | 'active' | 'paused' | 'archived';
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          status?: 'draft' | 'active' | 'paused' | 'archived';
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          status?: 'draft' | 'active' | 'paused' | 'archived';
          created_by?: string | null;
          updated_at?: string;
        };
      };
      funnel_stages: {
        Row: {
          id: string;
          funnel_id: string;
          name: string;
          type: 'landing' | 'questionnaire' | 'payment' | 'followup_form' | 'meeting_booking' | 'email';
          order: number;
          config: Json;
          email_template_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          funnel_id: string;
          name: string;
          type: 'landing' | 'questionnaire' | 'payment' | 'followup_form' | 'meeting_booking' | 'email';
          order?: number;
          config?: Json;
          email_template_id?: string | null;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          type?: 'landing' | 'questionnaire' | 'payment' | 'followup_form' | 'meeting_booking' | 'email';
          order?: number;
          config?: Json;
          email_template_id?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      email_templates: {
        Row: {
          id: string;
          name: string;
          subject: string;
          html_content: string;
          json_design: Json | null;
          variables: Json;
          funnel_id: string | null;
          stage_trigger: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subject?: string;
          html_content?: string;
          json_design?: Json | null;
          variables?: Json;
          funnel_id?: string | null;
          stage_trigger?: string | null;
        };
        Update: {
          name?: string;
          subject?: string;
          html_content?: string;
          json_design?: Json | null;
          variables?: Json;
          funnel_id?: string | null;
          stage_trigger?: string | null;
          updated_at?: string;
        };
      };
      questionnaire_configs: {
        Row: {
          id: string;
          funnel_id: string;
          stage_id: string;
          questions: Json;
          scoring_config: Json;
          branching_rules: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          funnel_id: string;
          stage_id: string;
          questions?: Json;
          scoring_config?: Json;
          branching_rules?: Json;
        };
        Update: {
          questions?: Json;
          scoring_config?: Json;
          branching_rules?: Json;
          updated_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          marketing_consent: boolean;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
          duration_seconds: number | null;
          result_pattern: string | null;
          result_scale_stage: string | null;
          result_top_metric: string | null;
          result_snapshot: Json | null;
          report_token: string | null;
          funnel_id: string | null;
          current_stage_id: string | null;
          payment_status: 'unpaid' | 'pending' | 'paid' | 'refunded';
          payment_date: string | null;
          payment_amount: number | null;
          payment_transaction_id: string | null;
          drive_folder_url: string | null;
          followup_submitted_at: string | null;
          meeting_booked_at: string | null;
          notes: string | null;
          tags: string[];
          lead_status: string;
          last_active_at: string | null;
          drop_off_question: string | null;
          progress_percent: number;
          partial_answers: Json | null;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          marketing_consent?: boolean;
          started_at?: string | null;
          completed_at?: string | null;
          duration_seconds?: number | null;
          result_pattern?: string | null;
          result_scale_stage?: string | null;
          result_top_metric?: string | null;
          result_snapshot?: Json | null;
          report_token?: string | null;
          funnel_id?: string | null;
          current_stage_id?: string | null;
          payment_status?: 'unpaid' | 'pending' | 'paid' | 'refunded';
          payment_date?: string | null;
          payment_amount?: number | null;
          payment_transaction_id?: string | null;
          drive_folder_url?: string | null;
          followup_submitted_at?: string | null;
          meeting_booked_at?: string | null;
          notes?: string | null;
          tags?: string[];
          lead_status?: string;
          last_active_at?: string | null;
          drop_off_question?: string | null;
          progress_percent?: number;
          partial_answers?: Json | null;
        };
        Update: {
          name?: string;
          email?: string;
          phone?: string | null;
          marketing_consent?: boolean;
          started_at?: string | null;
          completed_at?: string | null;
          duration_seconds?: number | null;
          result_pattern?: string | null;
          result_scale_stage?: string | null;
          result_top_metric?: string | null;
          result_snapshot?: Json | null;
          report_token?: string | null;
          funnel_id?: string | null;
          current_stage_id?: string | null;
          payment_status?: 'unpaid' | 'pending' | 'paid' | 'refunded';
          payment_date?: string | null;
          payment_amount?: number | null;
          payment_transaction_id?: string | null;
          drive_folder_url?: string | null;
          followup_submitted_at?: string | null;
          meeting_booked_at?: string | null;
          notes?: string | null;
          tags?: string[];
          lead_status?: string;
          last_active_at?: string | null;
          drop_off_question?: string | null;
          progress_percent?: number;
          partial_answers?: Json | null;
        };
      };
      documents: {
        Row: {
          id: string;
          lead_id: string;
          funnel_id: string | null;
          stage_id: string | null;
          file_name: string;
          file_url: string;
          file_size: number | null;
          mime_type: string | null;
          storage_path: string | null;
          drive_url: string | null;
          drive_file_id: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          funnel_id?: string | null;
          stage_id?: string | null;
          file_name: string;
          file_url: string;
          file_size?: number | null;
          mime_type?: string | null;
          storage_path?: string | null;
          drive_url?: string | null;
          drive_file_id?: string | null;
        };
        Update: {
          file_name?: string;
          file_url?: string;
          file_size?: number | null;
          mime_type?: string | null;
          storage_path?: string | null;
          drive_url?: string | null;
          drive_file_id?: string | null;
        };
      };
      email_logs: {
        Row: {
          id: string;
          lead_id: string;
          template_id: string | null;
          funnel_id: string | null;
          stage_id: string | null;
          subject: string | null;
          recipient_email: string | null;
          status: 'pending' | 'sent' | 'failed' | 'bounced';
          error: string | null;
          sent_at: string | null;
          opened_at: string | null;
          clicked_at: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          template_id?: string | null;
          funnel_id?: string | null;
          stage_id?: string | null;
          subject?: string | null;
          recipient_email?: string | null;
          status?: 'pending' | 'sent' | 'failed' | 'bounced';
          error?: string | null;
          sent_at?: string | null;
          metadata?: Json;
        };
        Update: {
          status?: 'pending' | 'sent' | 'failed' | 'bounced';
          error?: string | null;
          sent_at?: string | null;
          opened_at?: string | null;
          clicked_at?: string | null;
          metadata?: Json;
        };
      };
      notification_logs: {
        Row: {
          id: string;
          lead_id: string;
          channel: 'whatsapp' | 'sms';
          recipient_phone: string;
          message_body: string | null;
          template_name: string | null;
          status: 'pending' | 'sent' | 'delivered' | 'failed';
          provider_message_id: string | null;
          error: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          channel: 'whatsapp' | 'sms';
          recipient_phone: string;
          message_body?: string | null;
          template_name?: string | null;
          status?: 'pending' | 'sent' | 'delivered' | 'failed';
          provider_message_id?: string | null;
          error?: string | null;
          sent_at?: string | null;
        };
        Update: {
          status?: 'pending' | 'sent' | 'delivered' | 'failed';
          provider_message_id?: string | null;
          error?: string | null;
          sent_at?: string | null;
        };
      };
      followup_submissions: {
        Row: {
          id: string;
          lead_id: string;
          funnel_id: string | null;
          stage_id: string | null;
          form_data: Json;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          funnel_id?: string | null;
          stage_id?: string | null;
          form_data?: Json;
        };
        Update: {
          form_data?: Json;
        };
      };
      admin_activity_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          details?: Json;
        };
        Update: {
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          details?: Json;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_quiz_lead: {
        Args: {
          p_name: string;
          p_email: string;
          p_marketing_consent: boolean;
          p_phone?: string | null;
        };
        Returns: string;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
}
