import { listarTemplates } from "@/lib/db";
import GerenciadorTemplates from "@/components/templates/GerenciadorTemplates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Templates - Lead Hunter" };

export default async function TemplatesPage() {
  const templates = await listarTemplates();
  return <GerenciadorTemplates templates={templates} />;
}
