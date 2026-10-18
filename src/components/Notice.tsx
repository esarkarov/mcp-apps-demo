interface NoticeProps {
  kind?: "status" | "error";
  children: string;
  onRetry?: () => void;
}

export function Notice({ kind = "status", children, onRetry }: NoticeProps) {
  return (
    <div className="notice" role={kind === "error" ? "alert" : "status"}>
      <p className={kind === "error" ? "error" : "muted"}>{children}</p>
      {onRetry && <button onClick={onRetry}>Try again</button>}
    </div>
  );
}
