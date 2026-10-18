interface NoticeProps {
  kind?: "status" | "error";
  children: string;
  onRetry?: () => void;
}

export function Notice({ kind = "status", children, onRetry }: NoticeProps) {
  return (
    <div role={kind === "error" ? "alert" : "status"}>
      <p className={kind === "error" ? "error" : "muted"}>{children}</p>
      {onRetry && (
        <button onClick={onRetry} className="mb-2">
          Try again
        </button>
      )}
    </div>
  );
}
