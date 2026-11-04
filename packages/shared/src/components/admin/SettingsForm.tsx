"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export default function SettingsForm({
  low,
  high,
  ready,
}: {
  low: number;
  high: number;
  ready: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          low: Number(data.get("low")),
          high: Number(data.get("high")),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(
        "Limites atualizados. Os indicadores já usam suas preferências.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="admin-settings-form" onSubmit={submit}>
      <label>
        Considerar estoque baixo até
        <input
          name="low"
          type="number"
          defaultValue={low}
          min={0}
          max={100000}
          step={1}
          required
          disabled={!ready || busy}
        />
        <small>Variantes com estoque de 1 até este limite.</small>
      </label>
      <label>
        Considerar estoque alto a partir de
        <input
          name="high"
          type="number"
          defaultValue={high}
          min={1}
          max={1000000}
          step={1}
          required
          disabled={!ready || busy}
        />
        <small>Precisa ser maior que o limite de estoque baixo.</small>
      </label>
      {!ready && (
        <p className="admin-form-info">
          Os limites poderão ser salvos após a preparação do banco.
        </p>
      )}
      <button
        className="admin-button admin-button-primary"
        disabled={!ready || busy}
      >
        {busy ? "Salvando…" : "Salvar preferências"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
