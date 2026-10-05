export function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null;
  return <p className="form-message form-message--error" role="alert">{error instanceof Error ? error.message : "Something went wrong."}</p>;
}

export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return <div className="loading-block" role="status"><span className="spinner" /> <span>{label}…</span></div>;
}
