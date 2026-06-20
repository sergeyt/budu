import TgEventPage from "@/components/TgEventPage";

type Params = { id: string };

export default async function Page({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  return <TgEventPage eventId={id} />;
}
