import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

type WeatherStatCardProps = {
  label: string;
  value: number;
  unit?: string;
};

export function WeatherStatCard({ label, value, unit }: WeatherStatCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">
          {value.toFixed(1)} {unit}
        </p>
      </CardContent>
    </Card>
  );
}
