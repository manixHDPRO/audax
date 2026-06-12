'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewAudienceRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/audiences?new=1');
  }, [router]);

  return null;
}
