import { 
  Card, 
  CardContent,
} from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  count: number;
  icon: LucideIcon;
  color: string;
}

export default function StatsCard({ title, count, icon: Icon, color }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center">
          <div 
            className={`w-12 h-12 rounded-full flex items-center justify-center text-${color}`}
            style={{ backgroundColor: `hsla(var(--${color}), 0.2)` }}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-neutral-medium text-sm">{title}</p>
            <p className="text-2xl font-medium">{count}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
