import { Suspense } from "react";
import { ForgotForm } from "@/components/auth/PasswordReset";

export default function Page() {
  return (
    <Suspense>
      <ForgotForm />
    </Suspense>
  );
}
