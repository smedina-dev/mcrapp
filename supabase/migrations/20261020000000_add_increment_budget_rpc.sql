-- Función RPC para incrementar atómicamente el presupuesto de una orden
-- Usada para agregar el precio de servicios personalizados en órdenes EXPRESS

CREATE OR REPLACE FUNCTION incrementar_presupuesto_orden(
  p_orden_id uuid,
  p_taller_id uuid,
  p_incremento numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validar que el incremento sea positivo y finito
  IF p_incremento IS NULL OR p_incremento < 0 OR p_incremento > 9999999999.99 THEN
    RAISE EXCEPTION 'El incremento debe ser un valor positivo válido';
  END IF;

  -- Actualizar el presupuesto de forma atómica
  -- Solo si la orden existe, pertenece al taller y no está cerrada
  UPDATE orden_trabajo
  SET presupuesto_total = ROUND((presupuesto_total + p_incremento) * 100) / 100
  WHERE id = p_orden_id
    AND taller_id = p_taller_id
    AND recepcion_cerrada = false;

  -- Verificar que se actualizó exactamente una fila
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la orden o ya está cerrada';
  END IF;
END;
$$;

-- Comentario descriptivo
COMMENT ON FUNCTION incrementar_presupuesto_orden IS 
  'Incrementa atómicamente el presupuesto total de una orden de trabajo abierta. '
  'Usado para agregar servicios personalizados en recepciones EXPRESS.';