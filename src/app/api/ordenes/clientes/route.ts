import { NextResponse, type NextRequest } from "next/server";
import { requireWorkshop } from "@/lib/workshop";

const RESULT_LIMIT = 10;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 1 || query.length > 100) {
    return NextResponse.json({ customers: [] });
  }

  const { supabase, workshop } = await requireWorkshop();
  const prefix = query.replace(/[\\%_]/g, "\\$&");
  const { data, error } = await supabase.from("cliente")
    .select("id, nombre_completo, peso_kg")
    .eq("taller_id", workshop.id)
    .ilike("nombre_completo", `${prefix}%`)
    .order("nombre_completo")
    .limit(RESULT_LIMIT);

  if (error) {
    console.error("No se pudo buscar clientes para la recepción de una orden.", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json({ error: "No se pudo buscar clientes." }, { status: 500 });
  }

  return NextResponse.json({ customers: data ?? [] });
}
