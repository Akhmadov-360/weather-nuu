import { STREET_CONFIG } from '@/entities/weather/model/weather.constants';
import { DashboardLayout } from '@/widgets/dashboard-layout/ui/DashboardLayout';

export default function DashboardStreetPage(): React.JSX.Element {
  return <DashboardLayout config={STREET_CONFIG} />;
}
