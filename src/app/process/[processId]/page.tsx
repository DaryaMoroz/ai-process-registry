import { ProcessPage } from "@/features/process/ProcessPage";
export default async function Page({ params }: { params: Promise<{ processId: string }> }) {
  const { processId } = await params;
  return <ProcessPage key={processId} processId={processId} />;
}
