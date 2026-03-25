import { ROOM_CONFIG } from '@/entities/weather/model/weather.constants';
import { DashboardLayout } from '@/widgets/dashboard-layout/ui/DashboardLayout';

export default function DashboardRoomPage(): React.JSX.Element {
  return <DashboardLayout config={ROOM_CONFIG} />;
}
