import { useParams } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";

export function WorkOrderDetailsPage() {
  const { id } = useParams();
  return (
    <>
      <PageHeader title={`Zlecenie ${id}`} />
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white p-4 shadow md:col-span-2">
          Szczegóły zlecenia
        </div>
        <div className="rounded-xl bg-white p-4 shadow">Części</div>
      </div>
    </>
  );
}
