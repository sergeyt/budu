import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types/model";
import { CreatePlaceWizard } from "@/components/CreatePlaceWizard";

export const dynamic = "force-dynamic";

export default async function NewPlacePage() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    redirect("/");
  }
  if (user.role !== UserRole.SUPERADMIN) {
    redirect("/admin");
  }
  return <CreatePlaceWizard />;
}
