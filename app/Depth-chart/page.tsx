import { redirect } from 'next/navigation';

export default function DepthChartRedirect() {
  redirect('/?tab=depth-chart');
}