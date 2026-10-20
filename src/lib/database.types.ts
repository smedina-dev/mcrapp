export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      taller: {
        Row: { id: string; user_id: string | null; nombre: string; cuit_rut: string | null; telefono: string | null; logo_url: string | null; created_at: string | null };
        Insert: { id?: string; user_id?: string | null; nombre: string; cuit_rut?: string | null; telefono?: string | null; logo_url?: string | null; created_at?: string | null };
        Update: { id?: string; user_id?: string | null; nombre?: string; cuit_rut?: string | null; telefono?: string | null; logo_url?: string | null; created_at?: string | null };
        Relationships: [];
      };
      cliente: {
        Row: { id: string; taller_id: string; nombre_completo: string; nombre: string | null; apellido: string | null; dni: string | null; fecha_nacimiento: string | null; altura_cm: number | null; peso_kg: number | null; telefono: string; email: string | null; direccion: string | null; created_at: string | null };
        Insert: { id?: string; taller_id: string; nombre_completo: string; nombre?: string | null; apellido?: string | null; dni?: string | null; fecha_nacimiento?: string | null; altura_cm?: number | null; peso_kg?: number | null; telefono: string; email?: string | null; direccion?: string | null; created_at?: string | null };
        Update: { id?: string; taller_id?: string; nombre_completo?: string; nombre?: string | null; apellido?: string | null; dni?: string | null; fecha_nacimiento?: string | null; altura_cm?: number | null; peso_kg?: number | null; telefono?: string; email?: string | null; direccion?: string | null; created_at?: string | null };
        Relationships: [];
      };
      bicicleta: {
        Row: { id: string; taller_id: string; cliente_id: string | null; marca_modelo: string; marca: string | null; modelo: string | null; talle: string | null; color: string | null; tubelizada: boolean; liquido_tubeless: string | null; presion_horquilla_psi: number; rebote_horquilla_clicks: number; tiene_shock: boolean; presion_shock_psi: number | null; rebote_shock_baja_clicks: number | null; rebote_shock_alta_clicks: number | null; numero_serie: string | null; horquilla: string | null; shock: string | null; disciplina: Database["public"]["Enums"]["disciplina_bici_enum"] | null; primer_service_disponible: boolean | null; created_at: string | null };
        Insert: { id?: string; taller_id: string; cliente_id: string | null; marca_modelo: string; marca?: string | null; modelo?: string | null; talle?: string | null; color?: string | null; tubelizada?: boolean; liquido_tubeless?: string | null; presion_horquilla_psi?: number; rebote_horquilla_clicks?: number; tiene_shock?: boolean; presion_shock_psi?: number | null; rebote_shock_baja_clicks?: number | null; rebote_shock_alta_clicks?: number | null; numero_serie?: string | null; horquilla?: string | null; shock?: string | null; disciplina?: Database["public"]["Enums"]["disciplina_bici_enum"] | null; primer_service_disponible?: boolean | null; created_at?: string | null };
        Update: { id?: string; taller_id?: string; cliente_id?: string | null; marca_modelo?: string; marca?: string | null; modelo?: string | null; talle?: string | null; color?: string | null; tubelizada?: boolean; liquido_tubeless?: string | null; presion_horquilla_psi?: number; rebote_horquilla_clicks?: number; tiene_shock?: boolean; presion_shock_psi?: number | null; rebote_shock_baja_clicks?: number | null; rebote_shock_alta_clicks?: number | null; numero_serie?: string | null; horquilla?: string | null; shock?: string | null; disciplina?: Database["public"]["Enums"]["disciplina_bici_enum"] | null; primer_service_disponible?: boolean | null; created_at?: string | null };
        Relationships: [];
      };
      bicicleta_historial_propietario: {
        Row: { id: string; bicicleta_id: string; cliente_anterior_id: string | null; cliente_nuevo_id: string | null; fecha_cambio: string };
        Insert: { id?: string; bicicleta_id: string; cliente_anterior_id?: string | null; cliente_nuevo_id?: string | null; fecha_cambio?: string };
        Update: { id?: string; bicicleta_id?: string; cliente_anterior_id?: string | null; cliente_nuevo_id?: string | null; fecha_cambio?: string };
        Relationships: [];
      };
      servicio: {
        Row: { id: string; taller_id: string; nombre: string; categoria: Database["public"]["Enums"]["categoria_servicio_enum"]; precio_base: number; tiempo_estimado_min: number; checklist_plantilla: Json | null; created_at: string | null };
        Insert: { id?: string; taller_id: string; nombre: string; categoria: Database["public"]["Enums"]["categoria_servicio_enum"]; precio_base?: number; tiempo_estimado_min?: number; checklist_plantilla?: Json | null; created_at?: string | null };
        Update: { id?: string; taller_id?: string; nombre?: string; categoria?: Database["public"]["Enums"]["categoria_servicio_enum"]; precio_base?: number; tiempo_estimado_min?: number; checklist_plantilla?: Json | null; created_at?: string | null };
        Relationships: [];
      };
      proceso_servicio: {
        Row: { id: string; taller_id: string; nombre: string; categoria_componente: Database["public"]["Enums"]["categoria_componente_enum"]; importe_referencia: number | null; descuento_servicio_pct: number; tiempo_estimado_min: number | null; created_at: string };
        Insert: { id?: string; taller_id: string; nombre: string; categoria_componente?: Database["public"]["Enums"]["categoria_componente_enum"]; importe_referencia?: number | null; descuento_servicio_pct?: number; tiempo_estimado_min?: number | null; created_at?: string };
        Update: { id?: string; taller_id?: string; nombre?: string; categoria_componente?: Database["public"]["Enums"]["categoria_componente_enum"]; importe_referencia?: number | null; descuento_servicio_pct?: number; tiempo_estimado_min?: number | null; created_at?: string };
        Relationships: [];
      };
      servicio_proceso: {
        Row: { id: string; servicio_id: string; proceso_id: string; orden: number; created_at: string };
        Insert: { id?: string; servicio_id: string; proceso_id: string; orden?: number; created_at?: string };
        Update: { id?: string; servicio_id?: string; proceso_id?: string; orden?: number; created_at?: string };
        Relationships: [];
      };
      empleado: {
        Row: { id: string; taller_id: string; auth_user_id: string; email: string; nombre: string | null; apellido: string | null; fecha_nacimiento: string | null; fecha_ingreso: string | null; rango: "ayudante_mecanico" | "embalador" | "mecanico" | "mecanico_especializado" | "jefe_mecanicos" | null; fecha_inicio_rango: string | null; rol_acceso: "admin" | "jefe_taller" | "empleado"; activo: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; taller_id: string; auth_user_id: string; email: string; nombre?: string | null; apellido?: string | null; fecha_nacimiento?: string | null; fecha_ingreso?: string | null; rango?: "ayudante_mecanico" | "embalador" | "mecanico" | "mecanico_especializado" | "jefe_mecanicos" | null; fecha_inicio_rango?: string | null; rol_acceso?: "admin" | "jefe_taller" | "empleado"; activo?: boolean; created_at?: string; updated_at?: string };
        Update: { id?: string; taller_id?: string; auth_user_id?: string; email?: string; nombre?: string | null; apellido?: string | null; fecha_nacimiento?: string | null; fecha_ingreso?: string | null; rango?: "ayudante_mecanico" | "embalador" | "mecanico" | "mecanico_especializado" | "jefe_mecanicos" | null; fecha_inicio_rango?: string | null; rol_acceso?: "admin" | "jefe_taller" | "empleado"; activo?: boolean; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      empleado_historial_rango: {
        Row: { id: string; empleado_id: string; rango_anterior: string | null; rango_nuevo: string; fecha_cambio: string; cambiado_por: string | null };
        Insert: { id?: string; empleado_id: string; rango_anterior?: string | null; rango_nuevo: string; fecha_cambio?: string; cambiado_por?: string | null };
        Update: { id?: string; empleado_id?: string; rango_anterior?: string | null; rango_nuevo?: string; fecha_cambio?: string; cambiado_por?: string | null };
        Relationships: [];
      };
      agenda_turno: {
        Row: { id: string; taller_id: string; cliente_id: string; bicicleta_id: string; fecha_hora: string; estado: Database["public"]["Enums"]["estado_turno_enum"] | null; observaciones: string | null; created_at: string | null };
        Insert: { id?: string; taller_id: string; cliente_id: string; bicicleta_id: string; fecha_hora: string; estado?: Database["public"]["Enums"]["estado_turno_enum"] | null; observaciones?: string | null; created_at?: string | null };
        Update: { id?: string; taller_id?: string; cliente_id?: string; bicicleta_id?: string; fecha_hora?: string; estado?: Database["public"]["Enums"]["estado_turno_enum"] | null; observaciones?: string | null; created_at?: string | null };
        Relationships: [];
      };
      orden_trabajo: {
        Row: { id: string; numero_ot: number; taller_id: string; cliente_id: string; bicicleta_id: string; ot_garantia_id: string | null; estado: Database["public"]["Enums"]["estado_ot_enum"] | null; es_express: boolean | null; inspeccion_recepcion: Json | null; recomendaciones: Json | null; fotos: Json | null; bitacora_comunicaciones: Json | null; presupuesto_total: number; recepcion_cerrada: boolean; fecha_ingreso: string | null; fecha_entrega_estimada: string | null; fecha_cierre: string | null; created_at: string | null };
        Insert: { id?: string; numero_ot?: number; taller_id: string; cliente_id: string; bicicleta_id: string; ot_garantia_id?: string | null; estado?: Database["public"]["Enums"]["estado_ot_enum"] | null; es_express?: boolean | null; inspeccion_recepcion?: Json | null; recomendaciones?: Json | null; fotos?: Json | null; bitacora_comunicaciones?: Json | null; presupuesto_total?: number; recepcion_cerrada?: boolean; fecha_ingreso?: string | null; fecha_entrega_estimada?: string | null; fecha_cierre?: string | null; created_at?: string | null };
        Update: { id?: string; numero_ot?: number; taller_id?: string; cliente_id?: string; bicicleta_id?: string; ot_garantia_id?: string | null; estado?: Database["public"]["Enums"]["estado_ot_enum"] | null; es_express?: boolean | null; inspeccion_recepcion?: Json | null; recomendaciones?: Json | null; fotos?: Json | null; bitacora_comunicaciones?: Json | null; presupuesto_total?: number; recepcion_cerrada?: boolean; fecha_ingreso?: string | null; fecha_entrega_estimada?: string | null; fecha_cierre?: string | null; created_at?: string | null };
        Relationships: [];
      };
      orden_trabajo_servicio: {
        Row: { id: string; orden_trabajo_id: string; servicio_id: string; precio_aplicado: number; observaciones: string | null };
        Insert: { id?: string; orden_trabajo_id: string; servicio_id: string; precio_aplicado: number; observaciones?: string | null };
        Update: { id?: string; orden_trabajo_id?: string; servicio_id?: string; precio_aplicado?: number; observaciones?: string | null };
        Relationships: [];
      };
      orden_trabajo_proceso: {
        Row: { id: string; orden_trabajo_id: string; proceso_id: string; precio_lista: number; descuento_porcentaje: number; precio_aplicado: number; created_at: string };
        Insert: { id?: string; orden_trabajo_id: string; proceso_id: string; precio_lista: number; descuento_porcentaje?: number; precio_aplicado: number; created_at?: string };
        Update: { id?: string; orden_trabajo_id?: string; proceso_id?: string; precio_lista?: number; descuento_porcentaje?: number; precio_aplicado?: number; created_at?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      usuario_pertenece_taller: { Args: { p_taller_id: string }; Returns: boolean };
      usuario_es_admin_taller: { Args: { p_taller_id: string }; Returns: boolean };
      usuario_puede_gestionar_catalogo_taller: { Args: { p_taller_id: string }; Returns: boolean };
      reemplazar_procesos_servicio: { Args: { p_servicio_id: string; p_proceso_ids: string[] }; Returns: undefined };
      crear_servicio_con_procesos: { Args: { p_taller_id: string; p_nombre: string; p_categoria: Database["public"]["Enums"]["categoria_servicio_enum"]; p_precio_base: number; p_tiempo_estimado_min: number; p_proceso_ids: string[] }; Returns: string };
      crear_orden_trabajo_con_inspeccion: { Args: { p_taller_id: string; p_cliente_id: string; p_bicicleta_id: string; p_es_express: boolean; p_fecha_entrega_estimada: string | null; p_servicio_ids: string[]; p_proceso_ids: string[]; p_inspeccion_recepcion: Json }; Returns: string };
      finalizar_recepcion_orden_trabajo: { Args: { p_orden_trabajo_id: string; p_fotos: string[] }; Returns: undefined };
    };
    Enums: {
      categoria_servicio_enum: "basico" | "intermedio" | "avanzado" | "primer_service" | "agregado" | "express";
      categoria_componente_enum: "ruedas" | "frenos" | "caja_pedalera" | "horquilla" | "asiento" | "transmision" | "shock" | "cuadro" | "general";
      estado_turno_enum: "pendiente" | "confirmado" | "cancelado" | "en_taller";
      estado_ot_enum: "recepcion" | "en_proceso" | "espera_repuesto" | "listo" | "entregado";
      disciplina_bici_enum: "mtb_xc" | "mtb_enduro_dh" | "mtb_enduro" | "mtb_dh" | "ruta" | "gravel" | "urbana" | "ebike" | "otra";
    };
    CompositeTypes: { [_ in never]: never };
  };
};