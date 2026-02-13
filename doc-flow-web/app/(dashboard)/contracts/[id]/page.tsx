import { redirect } from 'next/navigation';

export default async function ContractPage({
    params
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    redirect(`/contracts/${id}/explorer`);
}
