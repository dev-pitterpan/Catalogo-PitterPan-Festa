export default function PitterSpinner({
  label = "Carregando…",
}: {
  label?: string;
}) {
  return (
    <span className="pitter-loading" role="status">
      <span className="pitter-spinner" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
