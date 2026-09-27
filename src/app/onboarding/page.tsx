"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { useProfile } from "@/lib/storage";
import { SessionScreen, useSession } from "@/components/SessionGate";

function Gate() {
  const session = useSession();
  const router = useRouter();
  const editStep = useSearchParams().get("edit") ?? undefined;
  const profile = useProfile();
  const redirectHome = profile && !editStep;

  useEffect(() => {
    if (redirectHome) router.replace("/");
  }, [redirectHome, router]);

  if (profile === undefined) return <SessionScreen status={session.status} retry={session.retry} />;
  if (redirectHome) return null;
  if (editStep && profile) return <Onboarding editProfile={profile} editStep={editStep} />;
  return <Onboarding />;
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <Gate />
    </Suspense>
  );
}
