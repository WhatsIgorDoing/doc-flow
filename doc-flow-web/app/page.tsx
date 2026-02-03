import { redirect } from 'next/navigation';

export default function HomePage() {
  // For Phase 1, redirect to a demo contract
  // In Phase 2, this will show contract selection
  redirect('/contracts/00000000-0000-0000-0000-000000000002/documents');
}
