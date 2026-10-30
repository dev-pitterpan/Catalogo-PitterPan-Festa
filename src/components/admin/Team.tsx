"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { UserPlus, ShieldCheck, Eye, EyeOff } from "lucide-react";
import AdminSelect from "./AdminSelect";
import { dateTime } from "./Primitives";
const roleLabels: Record<string, string> = {
  admin: "Administrador",
  gerente_compras: "Gerente de Compras",
  gestor: "Gestor",
  atendimento: "Atendimento",
};
export default function Team({
  users,
  ready,
  self,
}: {
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    disabled: boolean;
    created_at: string | null;
  }[];
  ready: boolean;
  self: string;
}) {
  const router = useRouter();
  const [role, setRole] = useState("atendimento");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      form.reset();
      setRole("atendimento");
      setShowPassword(false);
      setMessage(
        "Acesso criado. Compartilhe as credenciais com a pessoa por um canal seguro.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function update(id: string, disabled: boolean) {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/users/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, disabled }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(
        disabled
          ? "Acesso desativado. As sessões desta conta não terão mais acesso."
          : "Acesso reativado.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="admin-panel">
        <header>
          <h2>Quem faz a festa acontecer</h2>
          <ShieldCheck size={20} />
        </header>
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Permissão</th>
                <th>Situação</th>
                <th>Desde</th>
                <th>Acesso</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                  </td>
                  <td>{roleLabels[user.role]}</td>
                  <td>
                    <span
                      className={`admin-badge ${user.disabled ? "neutral" : "green"}`}
                    >
                      {user.disabled ? "Inativo" : "Ativo"}
                    </span>
                  </td>
                  <td>
                    {user.id === "bootstrap"
                      ? "Conta principal"
                      : dateTime(user.created_at)}
                  </td>
                  <td>
                    {user.id === "bootstrap" || user.id === self ? (
                      <span className="admin-subtle">Protegido</span>
                    ) : (
                      <button
                        className="admin-button"
                        disabled={busy}
                        onClick={() => update(user.id, !user.disabled)}
                      >
                        {user.disabled ? "Reativar" : "Desativar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-panel admin-team-create">
        <header>
          <div>
            <span className="admin-eyebrow">
              A PESSOA CERTA. O ACESSO CERTO.
            </span>
            <h2>Adicionar à equipe</h2>
          </div>
          <UserPlus size={21} />
        </header>
        {!ready && (
          <p className="admin-form-info">
            O cadastro de novas contas estará disponível após a preparação do
            banco. A conta principal continua disponível.
          </p>
        )}
        <form className="admin-settings-form" onSubmit={create}>
          <label>
            Nome
            <input
              required
              name="name"
              minLength={2}
              maxLength={100}
              disabled={!ready || busy}
            />
          </label>
          <label>
            E-mail
            <input
              required
              type="email"
              name="email"
              maxLength={254}
              autoComplete="off"
              disabled={!ready || busy}
            />
          </label>
          <div className="admin-team-role">
            <label htmlFor="team-role">Permissão</label>
            <AdminSelect
              id="team-role"
              name="role"
              label="Permissão"
              value={role}
              onValueChange={setRole}
              disabled={!ready || busy}
              options={[
                {
                  value: "atendimento",
                  label: "Atendimento · consulta e compartilhamento",
                },
                {
                  value: "gestor",
                  label: "Gestor · acompanhamento da operação",
                },
                {
                  value: "gerente_compras",
                  label: "Gerente de Compras · acesso completo",
                },
                {
                  value: "admin",
                  label: "Administrador · acessos e configurações",
                },
              ]}
            />
          </div>
          <label htmlFor="team-initial-password">
            Senha inicial
            <span className="admin-team-password">
              <input
                id="team-initial-password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                disabled={!ready || busy}
              />
              <button
                type="button"
                aria-label={
                  showPassword
                    ? "Ocultar senha inicial"
                    : "Mostrar senha inicial"
                }
                aria-controls="team-initial-password"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
                disabled={!ready || busy}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
            <small>Pelo menos 12 caracteres. Não envie senhas em grupos.</small>
          </label>
          <button
            className="admin-button admin-button-primary"
            disabled={!ready || busy}
          >
            {busy ? "Salvando…" : "Criar acesso"}
          </button>
        </form>
      </section>
      <p role="status" className="admin-copy-status">
        {message}
      </p>
    </>
  );
}
