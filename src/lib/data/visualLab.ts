import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type Modality = Database["core"]["Tables"]["modalities"]["Row"];

export async function getModalities(): Promise<Modality[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("modalities").select("*").order("id");
  return data ?? [];
}
