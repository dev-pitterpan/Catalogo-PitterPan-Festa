"use client";
import { useRouter } from "next/navigation";
import AdminSelect from "./AdminSelect";
import DateRangePicker from "./DateRangePicker";
import {
  shiftDate,
  todayDate,
  type DateRange,
} from "../../lib/admin/date-range";

export default function ChangeHistoryFilters({
  range,
  kind,
}: {
  range: DateRange;
  kind: string;
}) {
  const router = useRouter();
  function apply(value: DateRange) {
    router.push(
      `/gestor/alteracoes/?${new URLSearchParams({ ...value, kind })}`,
    );
  }
  return (
    <div className="sales-toolbar history-filters">
      <div>
        <span>Período das publicações</span>
        <AdminSelect
          label="Período das publicações"
          value={range.start ? "custom" : "latest"}
          options={[
            { value: "latest", label: "Última publicação" },
            { value: "1", label: "Hoje" },
            { value: "7", label: "Últimos 7 dias" },
            { value: "30", label: "Últimos 30 dias" },
            ...(range.start
              ? [{ value: "custom", label: "Período selecionado" }]
              : []),
          ]}
          onValueChange={(value) => {
            if (value === "custom") return;
            const days = Number(value);
            const end = todayDate();
            apply(
              days
                ? { start: shiftDate(end, 1 - days), end }
                : { start: "", end: "" },
            );
          }}
        />
      </div>
      <DateRangePicker value={range} onChange={apply} />
    </div>
  );
}
