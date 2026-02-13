import { cn } from "@/lib/utils";

type StatusType = "active" | "paused" | "completed" | "draft" | "pending" | "sent" | "failed" | "replied" | "new" | "qualified" | "contacted";

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-success/15 text-success" },
  paused: { label: "Pausado", className: "bg-warning/15 text-warning" },
  completed: { label: "Concluído", className: "bg-muted text-muted-foreground" },
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  pending: { label: "Pendente", className: "bg-info/15 text-info" },
  sent: { label: "Enviado", className: "bg-info/15 text-info" },
  failed: { label: "Falhou", className: "bg-destructive/15 text-destructive" },
  replied: { label: "Respondido", className: "bg-success/15 text-success" },
  new: { label: "Novo", className: "bg-primary/15 text-primary" },
  qualified: { label: "Qualificado", className: "bg-success/15 text-success" },
  contacted: { label: "Contatado", className: "bg-info/15 text-info" },
};

export default function StatusBadge({ status }: { status: StatusType }) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", config.className)}>
      {config.label}
    </span>
  );
}
