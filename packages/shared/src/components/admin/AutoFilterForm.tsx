"use client";
import PitterSpinner from "./PitterSpinner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useTransition,
  type ReactNode,
} from "react";

const FilterContext = createContext<((immediate?: boolean) => void) | null>(
  null,
);
export const useAutoFilter = () => useContext(FilterContext);

/** GET filters keep pagination/shareable URLs and never submit a mutation. */
export default function AutoFilterForm({
  action,
  className,
  children,
}: {
  action: string;
  className: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pending, startTransition] = useTransition();
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    clearTimeout(timer.current);
  }, [pathname]);
  useEffect(() => {
    // Restore unfocused text filters after links, pagination and browser history.
    for (const field of Array.from(form.current?.elements || [])) {
      if (
        field instanceof HTMLInputElement &&
        field.type !== "hidden" &&
        field !== document.activeElement &&
        field.name
      ) {
        field.value = params.get(field.name) || "";
      }
    }
  }, [params]);
  function apply(immediate = false) {
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        if (!form.current) return;
        const params = new URLSearchParams();
        for (const [key, value] of new FormData(form.current)) {
          if (typeof value === "string" && value.trim() && key !== "page")
            params.set(key, value.trim());
        }
        startTransition(() =>
          router.replace(`${action}${params.size ? `?${params}` : ""}`, {
            scroll: false,
          }),
        );
      },
      immediate ? 0 : 400,
    );
  }
  return (
    <FilterContext.Provider value={apply}>
      <form
        ref={form}
        action={action}
        method="GET"
        className={className}
        aria-busy={pending}
        onChange={(event) => {
          if (!(
            event.target instanceof HTMLInputElement &&
            event.target.type === "hidden"
          ))
            apply(event.target instanceof HTMLSelectElement);
        }}
        onSubmit={(event) => {
          event.preventDefault();
          apply(true);
        }}
      >
        {children}
        <span className="admin-filter-status" role="status" aria-live="polite">
          {pending ? (
            <PitterSpinner label="Atualizando resultados…" />
          ) : (
            "Filtros automáticos"
          )}
        </span>
      </form>
    </FilterContext.Provider>
  );
}
