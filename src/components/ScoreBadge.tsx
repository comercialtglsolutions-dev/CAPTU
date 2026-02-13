import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
}

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            score >= 75 ? "bg-success" : score >= 50 ? "bg-warning" : "bg-destructive"
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn(
        "text-xs font-bold",
        score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive"
      )}>
        {score}
      </span>
    </div>
  );
}
