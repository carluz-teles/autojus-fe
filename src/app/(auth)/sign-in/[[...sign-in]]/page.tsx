import { SignIn } from "@clerk/nextjs";

import { InviteNotice } from "@/features/organization/components/invite-notice";
import { APP_HOME_PATH } from "@/lib/routes";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    __clerk_status?: string;
    __clerk_ticket?: string;
    org_id?: string;
  }>;
}) {
  const params = await searchParams;
  const isInvite =
    params.__clerk_status === "sign_in" && !!params.__clerk_ticket;
  const orgHint =
    isInvite && params.org_id && /^org_[A-Za-z0-9]+$/.test(params.org_id)
      ? params.org_id
      : null;

  return (
    <div className="flex flex-col items-center gap-5">
      {isInvite ? <InviteNotice mode="sign_in" /> : null}
      <SignIn
        forceRedirectUrl={
          isInvite
            ? orgHint
              ? `${APP_HOME_PATH}?org_id=${orgHint}`
              : APP_HOME_PATH
            : undefined
        }
      />
    </div>
  );
}
