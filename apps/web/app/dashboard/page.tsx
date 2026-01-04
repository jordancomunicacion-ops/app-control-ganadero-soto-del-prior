import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { LivestockApp } from '@/components/LivestockApp';

export default async function DashboardPage() {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

    return <LivestockApp session={session} />;
}
