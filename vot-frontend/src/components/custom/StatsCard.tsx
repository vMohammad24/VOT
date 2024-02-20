import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

type CardProps = React.ComponentProps<typeof Card>;
type StatsCardProps = {
  title: string;
  value: string;
} & CardProps;

export default function StatsCard({
  className,
  title,
  value,
  ...props
}: StatsCardProps) {
  return (
    <Card className={cn("w-[238px]", className)} {...props}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-small leading-none">{value}</p>
      </CardContent>
    </Card>
  );
}
