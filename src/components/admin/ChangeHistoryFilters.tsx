"use client";
import { useRouter } from "next/navigation";
import DateRangePicker from "./DateRangePicker";
import {
  shiftDate,
  todayDate,
  type DateRange,
} from "../../lib/admin/date-range";

export default function ChangeHistoryFilters({ range }: { range: DateRange }) {
  const router = useRouter();
  function apply(value: DateRange) {
    router.push(`/gestor/alteracoes/?${new URLSearchParams(value)}`);
  }
  return (
    <div className="sales-toolbar">
      <label>
        Período das publicações
        <select
          aria-label="Período das publicações"
          value={range.start ? "custom" : "latest"}
          onChange={(event) => {
            const days = Number(event.target.value);
            const end = todayDate();
            apply(
              days
                ? { start: shiftDate(end, 1 - days), end }
                : { start: "", end: "" },
            );
          }}
        >
          <option value="latest">Última publicação</option>
          <option value="1">Hoje</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="custom" disabled>
            Período selecionado
          </option>
        </select>
      </label>
      <DateRangePicker value={range} onChange={apply} />
    </div>
  );
}
