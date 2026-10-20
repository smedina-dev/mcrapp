import { NextResponse, type NextRequest } from "next/server";
import { requireWorkshop } from "@/lib/workshop";

type RouteContext = { params: { clienteId: string } };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { supabase, workshop } = await requireWorkshop();
  const { data: customer, error: customerError } = await supabase.from("cliente")
    .select("id")
    .eq("id", params.clienteId)
    .eq("taller_id", workshop.id)
    .maybeSingle();

  if (customerError) {
    console.error("No se pudo validar el cliente al cargar bicicletas para una orden.", {
      code: customerError.code,
      message: customerError.message,
    });
    return NextResponse.json({ error: "No se pudieron cargar las bicicletas." }, { status: 500 });
  }
  if (!customer) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });

  const { data, error } = await supabase.from("bicicleta")
    .select("id, cliente_id, marca_modelo, tiene_shock")
    .eq("cliente_id", customer.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("No se pudieron cargar bicicletas para la recepción de una orden.", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json({ error: "No se pudieron cargar las bicicletas." }, { status: 500 });
  }

  return NextResponse.json({ bicycles: data ?? [] });
}
