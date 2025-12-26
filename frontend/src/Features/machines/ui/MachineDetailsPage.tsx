import { useParams } from "react-router-dom";
import { useMachinesStore } from "../../../entities/machines/model/useMachinesStore";
import { PageHeader } from "../../../shared/ui/PageHeader";

export function MachineDetailsPage() {
  const { id } = useParams();
  const m = useMachinesStore((s) => s.getById(id!));

  if (!m) return <div>Nie znaleziono maszyny</div>;

  return (
    <>
      <PageHeader title={m.name} />
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white p-4 shadow md:col-span-2">
          <div className="text-sm">Model: {m.model ?? "-"}</div>
          <div className="text-sm">Status: {m.status}</div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow">Oś czasu WO</div>
        <div className="rounded-xl bg-white p-4 shadow md:col-span-3">
          Historia awarii
        </div>
      </div>
    </>
  );
}
