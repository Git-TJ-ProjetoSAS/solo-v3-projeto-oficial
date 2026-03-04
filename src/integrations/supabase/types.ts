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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cad_culturas: {
        Row: {
          id_cultura: number
          meta_n_ano1: number | null
          nome: string
          sistema_padrao: string | null
        }
        Insert: {
          id_cultura?: number
          meta_n_ano1?: number | null
          nome: string
          sistema_padrao?: string | null
        }
        Update: {
          id_cultura?: number
          meta_n_ano1?: number | null
          nome?: string
          sistema_padrao?: string | null
        }
        Relationships: []
      }
      daily_weather_history: {
        Row: {
          created_at: string
          date: string
          eto: number
          id: string
          rainfall_api: number | null
          t_max: number | null
          t_min: number | null
          talhao_id: string
        }
        Insert: {
          created_at?: string
          date: string
          eto: number
          id?: string
          rainfall_api?: number | null
          t_max?: number | null
          t_min?: number | null
          talhao_id: string
        }
        Update: {
          created_at?: string
          date?: string
          eto?: number
          id?: string
          rainfall_api?: number | null
          t_max?: number | null
          t_min?: number | null
          talhao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_weather_history_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          acido_fulvico: number
          acido_humico: number
          aminoacidos: number
          carbono_organico: number
          correcao_caco3: number
          correcao_camg: number
          correcao_prnt: number
          created_at: string
          created_by: string | null
          culturas: string[] | null
          fornecedor: string
          foto_url: string | null
          id: string
          indice_salino: number
          macro_ca: number
          macro_k2o: number
          macro_n: number
          macro_p2o5: number
          macro_s: number
          marca: string
          materia_organica_perc: number
          medida: string
          micro_b: number
          micro_co: number
          micro_cu: number
          micro_fe: number
          micro_mg: number
          micro_mn: number
          micro_mo: number
          micro_se: number
          micro_zn: number
          nome: string
          observacoes: string | null
          preco: number
          principios_ativos: Json | null
          recomendacao_dose_ha: number | null
          recomendacao_dose_unidade: string | null
          solubilidade: number
          status: string
          tamanho_unidade: number
          tipo_produto: string
          updated_at: string
        }
        Insert: {
          acido_fulvico?: number
          acido_humico?: number
          aminoacidos?: number
          carbono_organico?: number
          correcao_caco3?: number
          correcao_camg?: number
          correcao_prnt?: number
          created_at?: string
          created_by?: string | null
          culturas?: string[] | null
          fornecedor: string
          foto_url?: string | null
          id?: string
          indice_salino?: number
          macro_ca?: number
          macro_k2o?: number
          macro_n?: number
          macro_p2o5?: number
          macro_s?: number
          marca: string
          materia_organica_perc?: number
          medida: string
          micro_b?: number
          micro_co?: number
          micro_cu?: number
          micro_fe?: number
          micro_mg?: number
          micro_mn?: number
          micro_mo?: number
          micro_se?: number
          micro_zn?: number
          nome: string
          observacoes?: string | null
          preco: number
          principios_ativos?: Json | null
          recomendacao_dose_ha?: number | null
          recomendacao_dose_unidade?: string | null
          solubilidade?: number
          status?: string
          tamanho_unidade: number
          tipo_produto: string
          updated_at?: string
        }
        Update: {
          acido_fulvico?: number
          acido_humico?: number
          aminoacidos?: number
          carbono_organico?: number
          correcao_caco3?: number
          correcao_camg?: number
          correcao_prnt?: number
          created_at?: string
          created_by?: string | null
          culturas?: string[] | null
          fornecedor?: string
          foto_url?: string | null
          id?: string
          indice_salino?: number
          macro_ca?: number
          macro_k2o?: number
          macro_n?: number
          macro_p2o5?: number
          macro_s?: number
          marca?: string
          materia_organica_perc?: number
          medida?: string
          micro_b?: number
          micro_co?: number
          micro_cu?: number
          micro_fe?: number
          micro_mg?: number
          micro_mn?: number
          micro_mo?: number
          micro_se?: number
          micro_zn?: number
          nome?: string
          observacoes?: string | null
          preco?: number
          principios_ativos?: Json | null
          recomendacao_dose_ha?: number | null
          recomendacao_dose_unidade?: string | null
          solubilidade?: number
          status?: string
          tamanho_unidade?: number
          tipo_produto?: string
          updated_at?: string
        }
        Relationships: []
      }
      irrigation_logs: {
        Row: {
          confirmed_at: string | null
          created_at: string
          date: string
          deficit_mm: number
          etc_mm: number
          id: string
          irrigation_mm: number
          rain_manual_mm: number
          rain_mm: number
          talhao_id: string
          updated_at: string
          user_id: string
          weather_snapshot: Json | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          date?: string
          deficit_mm?: number
          etc_mm?: number
          id?: string
          irrigation_mm?: number
          rain_manual_mm?: number
          rain_mm?: number
          talhao_id: string
          updated_at?: string
          user_id: string
          weather_snapshot?: Json | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          date?: string
          deficit_mm?: number
          etc_mm?: number
          id?: string
          irrigation_mm?: number
          rain_manual_mm?: number
          rain_mm?: number
          talhao_id?: string
          updated_at?: string
          user_id?: string
          weather_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "irrigation_logs_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      janelas_fenologicas: {
        Row: {
          created_at: string
          cultura: string
          id: string
          mes_fim: number
          mes_inicio: number
          nome_fase: string
          notas: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cultura?: string
          id?: string
          mes_fim: number
          mes_inicio: number
          nome_fase: string
          notas?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cultura?: string
          id?: string
          mes_fim?: number
          mes_inicio?: number
          nome_fase?: string
          notas?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      labor_config: {
        Row: {
          created_at: string
          description: string
          farm_id: string
          id: string
          labor_type: string
          quantity: number
          unit_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          farm_id: string
          id?: string
          labor_type?: string
          quantity?: number
          unit_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          farm_id?: string
          id?: string
          labor_type?: string
          quantity?: number
          unit_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      matriz_parcelamento: {
        Row: {
          cultura: string | null
          id: number
          mes: string | null
          perc_macro: number | null
          perc_micro: number | null
        }
        Insert: {
          cultura?: string | null
          id?: number
          mes?: string | null
          perc_macro?: number | null
          perc_micro?: number | null
        }
        Update: {
          cultura?: string | null
          id?: number
          mes?: string | null
          perc_macro?: number | null
          perc_micro?: number | null
        }
        Relationships: []
      }
      ordens_servico: {
        Row: {
          area_aplicacao_ha: number
          checklist_seguranca: Json | null
          clima_snapshot: Json | null
          created_at: string
          data_conclusao: string | null
          data_inicio_execucao: string | null
          data_liberacao: string | null
          data_prevista: string | null
          id: string
          janela_id: string | null
          notas: string | null
          status: Database["public"]["Enums"]["os_status"]
          talhao_id: string
          tempo_execucao_min: number | null
          tipo_operacao: Database["public"]["Enums"]["os_tipo_operacao"]
          updated_at: string
          user_id: string
          volume_calda_hectare: number
        }
        Insert: {
          area_aplicacao_ha?: number
          checklist_seguranca?: Json | null
          clima_snapshot?: Json | null
          created_at?: string
          data_conclusao?: string | null
          data_inicio_execucao?: string | null
          data_liberacao?: string | null
          data_prevista?: string | null
          id?: string
          janela_id?: string | null
          notas?: string | null
          status?: Database["public"]["Enums"]["os_status"]
          talhao_id: string
          tempo_execucao_min?: number | null
          tipo_operacao?: Database["public"]["Enums"]["os_tipo_operacao"]
          updated_at?: string
          user_id: string
          volume_calda_hectare?: number
        }
        Update: {
          area_aplicacao_ha?: number
          checklist_seguranca?: Json | null
          clima_snapshot?: Json | null
          created_at?: string
          data_conclusao?: string | null
          data_inicio_execucao?: string | null
          data_liberacao?: string | null
          data_prevista?: string | null
          id?: string
          janela_id?: string | null
          notas?: string | null
          status?: Database["public"]["Enums"]["os_status"]
          talhao_id?: string
          tempo_execucao_min?: number | null
          tipo_operacao?: Database["public"]["Enums"]["os_tipo_operacao"]
          updated_at?: string
          user_id?: string
          volume_calda_hectare?: number
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_janela_id_fkey"
            columns: ["janela_id"]
            isOneToOne: false
            referencedRelation: "janelas_fenologicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      os_receita_tanque: {
        Row: {
          created_at: string
          dose_hectare: number
          id: string
          insumo_id: string | null
          insumo_nome: string
          notas: string | null
          ordem_mistura: number
          os_id: string
          unidade: string
        }
        Insert: {
          created_at?: string
          dose_hectare?: number
          id?: string
          insumo_id?: string | null
          insumo_nome: string
          notas?: string | null
          ordem_mistura?: number
          os_id: string
          unidade?: string
        }
        Update: {
          created_at?: string
          dose_hectare?: number
          id?: string
          insumo_id?: string | null
          insumo_nome?: string
          notas?: string | null
          ordem_mistura?: number
          os_id?: string
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_receita_tanque_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_receita_tanque_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      production_costs_config: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          irrigation_cost_per_ha: number
          tarpaulin_cost_per_m2: number
          tarpaulin_m2: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          id?: string
          irrigation_cost_per_ha?: number
          tarpaulin_cost_per_m2?: number
          tarpaulin_m2?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          irrigation_cost_per_ha?: number
          tarpaulin_cost_per_m2?: number
          tarpaulin_m2?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          crea_art: string | null
          created_at: string
          endereco_propriedade: string | null
          full_name: string | null
          id: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          crea_art?: string | null
          created_at?: string
          endereco_propriedade?: string | null
          full_name?: string | null
          id?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          crea_art?: string | null
          created_at?: string
          endereco_propriedade?: string | null
          full_name?: string | null
          id?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_config: {
        Row: {
          created_at: string
          id: string
          private_key_jwk: Json
          public_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          private_key_jwk: Json
          public_key: string
        }
        Update: {
          created_at?: string
          id?: string
          private_key_jwk?: Json
          public_key?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      rainfall_history: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          rainfall_mm: number
          talhao_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          rainfall_mm?: number
          talhao_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          rainfall_mm?: number
          talhao_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rainfall_history_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_fosforo_plantio: {
        Row: {
          id: number
          nivel_p_solo_max: number | null
          nivel_p_solo_min: number | null
          recomendacao_g_p2o5: number | null
        }
        Insert: {
          id?: number
          nivel_p_solo_max?: number | null
          nivel_p_solo_min?: number | null
          recomendacao_g_p2o5?: number | null
        }
        Update: {
          id?: number
          nivel_p_solo_max?: number | null
          nivel_p_solo_min?: number | null
          recomendacao_g_p2o5?: number | null
        }
        Relationships: []
      }
      ref_potassio_ano1: {
        Row: {
          id: number
          nivel_k_solo_max: number | null
          nivel_k_solo_min: number | null
          recomendacao_g_k2o: number | null
        }
        Insert: {
          id?: number
          nivel_k_solo_max?: number | null
          nivel_k_solo_min?: number | null
          recomendacao_g_k2o?: number | null
        }
        Update: {
          id?: number
          nivel_k_solo_max?: number | null
          nivel_k_solo_min?: number | null
          recomendacao_g_k2o?: number | null
        }
        Relationships: []
      }
      ref_tarifas_energia: {
        Row: {
          ano_referencia: number
          distribuidoras: string
          id: number
          regiao: string
          tarifa_media_kwh: number
        }
        Insert: {
          ano_referencia?: number
          distribuidoras: string
          id?: number
          regiao: string
          tarifa_media_kwh: number
        }
        Update: {
          ano_referencia?: number
          distribuidoras?: string
          id?: number
          regiao?: string
          tarifa_media_kwh?: number
        }
        Relationships: []
      }
      safra_metas: {
        Row: {
          area_hectares: number
          created_at: string
          expectativa_sacos: number
          id: string
          preco_saca_referencia: number
          safra: string
          talhao_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area_hectares?: number
          created_at?: string
          expectativa_sacos?: number
          id?: string
          preco_saca_referencia?: number
          safra?: string
          talhao_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area_hectares?: number
          created_at?: string
          expectativa_sacos?: number
          id?: string
          preco_saca_referencia?: number
          safra?: string
          talhao_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safra_metas_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      scouting_notes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          lat: number
          lng: number
          talhao_id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          lat: number
          lng: number
          talhao_id: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          lat?: number
          lng?: number
          talhao_id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scouting_notes_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      soil_analyses: {
        Row: {
          areia: number | null
          argila: number | null
          b: number
          ca: number
          created_at: string
          cu: number
          fe: number
          h_al: number
          id: string
          k: number
          mg: number
          mn: number
          mo: number
          notes: string | null
          p: number
          s: number
          silte: number | null
          talhao_id: string | null
          textura: string
          textura_fonte: string
          updated_at: string
          user_id: string
          v_percent: number
          zn: number
        }
        Insert: {
          areia?: number | null
          argila?: number | null
          b?: number
          ca?: number
          created_at?: string
          cu?: number
          fe?: number
          h_al?: number
          id?: string
          k?: number
          mg?: number
          mn?: number
          mo?: number
          notes?: string | null
          p?: number
          s?: number
          silte?: number | null
          talhao_id?: string | null
          textura?: string
          textura_fonte?: string
          updated_at?: string
          user_id: string
          v_percent?: number
          zn?: number
        }
        Update: {
          areia?: number | null
          argila?: number | null
          b?: number
          ca?: number
          created_at?: string
          cu?: number
          fe?: number
          h_al?: number
          id?: string
          k?: number
          mg?: number
          mn?: number
          mo?: number
          notes?: string | null
          p?: number
          s?: number
          silte?: number | null
          talhao_id?: string | null
          textura?: string
          textura_fonte?: string
          updated_at?: string
          user_id?: string
          v_percent?: number
          zn?: number
        }
        Relationships: [
          {
            foreignKeyName: "soil_analyses_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      talhao_history: {
        Row: {
          area_ha: number
          coffee_type: string
          cost_per_ha: number
          cost_per_saca: number
          created_at: string
          drench_data: Json | null
          fertigation_data: Json | null
          id: string
          insumos_data: Json | null
          leaf_analysis_data: Json | null
          liming_cost_per_ha: number
          liming_data: Json | null
          notes: string | null
          productivity_data: Json | null
          productivity_level: string
          productivity_target: number
          soil_data: Json | null
          spraying_data: Json | null
          talhao_id: string
          treatment_cost_per_ha: number
          treatment_plan_data: Json | null
          user_id: string
        }
        Insert: {
          area_ha?: number
          coffee_type?: string
          cost_per_ha?: number
          cost_per_saca?: number
          created_at?: string
          drench_data?: Json | null
          fertigation_data?: Json | null
          id?: string
          insumos_data?: Json | null
          leaf_analysis_data?: Json | null
          liming_cost_per_ha?: number
          liming_data?: Json | null
          notes?: string | null
          productivity_data?: Json | null
          productivity_level?: string
          productivity_target?: number
          soil_data?: Json | null
          spraying_data?: Json | null
          talhao_id: string
          treatment_cost_per_ha?: number
          treatment_plan_data?: Json | null
          user_id: string
        }
        Update: {
          area_ha?: number
          coffee_type?: string
          cost_per_ha?: number
          cost_per_saca?: number
          created_at?: string
          drench_data?: Json | null
          fertigation_data?: Json | null
          id?: string
          insumos_data?: Json | null
          leaf_analysis_data?: Json | null
          liming_cost_per_ha?: number
          liming_data?: Json | null
          notes?: string | null
          productivity_data?: Json | null
          productivity_level?: string
          productivity_target?: number
          soil_data?: Json | null
          spraying_data?: Json | null
          talhao_id?: string
          treatment_cost_per_ha?: number
          treatment_plan_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talhao_history_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      talhoes: {
        Row: {
          agro_polygon_id: string | null
          area_ha: number
          center_lat: number | null
          center_lng: number | null
          coffee_type: string
          cost_per_ha: number
          cost_per_saca: number
          created_at: string
          drip_flow_rate_lh: number
          drip_spacing_m: number
          fertilization_data: Json | null
          geojson: Json | null
          id: string
          irrigated: boolean
          irrigation_system: string
          is_autocompensating: boolean
          name: string
          notes: string | null
          operation_status: string
          pest_history: Json | null
          plant_spacing_cm: number
          planting_month: number
          planting_year: number
          productivity_target: number
          row_spacing_cm: number
          total_plants: number
          updated_at: string
          user_id: string
          variety: string
        }
        Insert: {
          agro_polygon_id?: string | null
          area_ha?: number
          center_lat?: number | null
          center_lng?: number | null
          coffee_type?: string
          cost_per_ha?: number
          cost_per_saca?: number
          created_at?: string
          drip_flow_rate_lh?: number
          drip_spacing_m?: number
          fertilization_data?: Json | null
          geojson?: Json | null
          id?: string
          irrigated?: boolean
          irrigation_system?: string
          is_autocompensating?: boolean
          name: string
          notes?: string | null
          operation_status?: string
          pest_history?: Json | null
          plant_spacing_cm?: number
          planting_month?: number
          planting_year?: number
          productivity_target?: number
          row_spacing_cm?: number
          total_plants?: number
          updated_at?: string
          user_id: string
          variety?: string
        }
        Update: {
          agro_polygon_id?: string | null
          area_ha?: number
          center_lat?: number | null
          center_lng?: number | null
          coffee_type?: string
          cost_per_ha?: number
          cost_per_saca?: number
          created_at?: string
          drip_flow_rate_lh?: number
          drip_spacing_m?: number
          fertilization_data?: Json | null
          geojson?: Json | null
          id?: string
          irrigated?: boolean
          irrigation_system?: string
          is_autocompensating?: boolean
          name?: string
          notes?: string | null
          operation_status?: string
          pest_history?: Json | null
          plant_spacing_cm?: number
          planting_month?: number
          planting_year?: number
          productivity_target?: number
          row_spacing_cm?: number
          total_plants?: number
          updated_at?: string
          user_id?: string
          variety?: string
        }
        Relationships: []
      }
      tractor_operations_config: {
        Row: {
          cost_per_hour_own: number
          cost_per_hour_rent: number
          created_at: string
          farm_id: string
          hectares: number
          hours_per_ha: number
          id: string
          operation_name: string
          tractor_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_per_hour_own?: number
          cost_per_hour_rent?: number
          created_at?: string
          farm_id: string
          hectares?: number
          hours_per_ha?: number
          id?: string
          operation_name: string
          tractor_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_per_hour_own?: number
          cost_per_hour_rent?: number
          created_at?: string
          farm_id?: string
          hectares?: number
          hours_per_ha?: number
          id?: string
          operation_name?: string
          tractor_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transacoes_financeiras: {
        Row: {
          categoria: string
          created_at: string
          data: string
          descricao: string
          fornecedor: string | null
          id: string
          insumo_id: string | null
          metodo_entrada: string
          notas: string | null
          quantidade: number
          safra: string | null
          status: string
          talhao_id: string | null
          tipo: string
          updated_at: string
          user_id: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string
          fornecedor?: string | null
          id?: string
          insumo_id?: string | null
          metodo_entrada?: string
          notas?: string | null
          quantidade?: number
          safra?: string | null
          status?: string
          talhao_id?: string | null
          tipo?: string
          updated_at?: string
          user_id: string
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string
          fornecedor?: string | null
          id?: string
          insumo_id?: string | null
          metodo_entrada?: string
          notas?: string | null
          quantidade?: number
          safra?: string | null
          status?: string
          talhao_id?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_financeiras_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_financeiras_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          dark_mode: boolean
          id: string
          notifications_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dark_mode?: boolean
          id?: string
          notifications_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dark_mode?: boolean
          id?: string
          notifications_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      water_deficit_alerts: {
        Row: {
          created_at: string
          deficit_mm: number
          id: string
          message: string
          read: boolean
          severity: string
          talhao_id: string
          threshold_mm: number
          user_id: string
        }
        Insert: {
          created_at?: string
          deficit_mm?: number
          id?: string
          message?: string
          read?: boolean
          severity?: string
          talhao_id: string
          threshold_mm?: number
          user_id: string
        }
        Update: {
          created_at?: string
          deficit_mm?: number
          id?: string
          message?: string
          read?: boolean
          severity?: string
          talhao_id?: string
          threshold_mm?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_deficit_alerts_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      transition_os_status: {
        Args: {
          _checklist?: Json
          _new_status: Database["public"]["Enums"]["os_status"]
          _os_id: string
        }
        Returns: {
          area_aplicacao_ha: number
          checklist_seguranca: Json | null
          clima_snapshot: Json | null
          created_at: string
          data_conclusao: string | null
          data_inicio_execucao: string | null
          data_liberacao: string | null
          data_prevista: string | null
          id: string
          janela_id: string | null
          notas: string | null
          status: Database["public"]["Enums"]["os_status"]
          talhao_id: string
          tempo_execucao_min: number | null
          tipo_operacao: Database["public"]["Enums"]["os_tipo_operacao"]
          updated_at: string
          user_id: string
          volume_calda_hectare: number
        }
        SetofOptions: {
          from: "*"
          to: "ordens_servico"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "produtor" | "consultor"
      os_status:
        | "bloqueada_clima"
        | "liberada"
        | "em_execucao"
        | "concluida"
        | "cancelada"
      os_tipo_operacao: "solo" | "foliar_casada" | "correcao"
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
      app_role: ["produtor", "consultor"],
      os_status: [
        "bloqueada_clima",
        "liberada",
        "em_execucao",
        "concluida",
        "cancelada",
      ],
      os_tipo_operacao: ["solo", "foliar_casada", "correcao"],
    },
  },
} as const
