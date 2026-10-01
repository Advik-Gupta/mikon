import { Suspense } from "react";
import { ResetForm } from "@/components/auth/PasswordReset";

export default function Page() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
