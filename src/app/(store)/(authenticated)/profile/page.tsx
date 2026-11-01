import { ProfileDetailsLoading } from "~/app/_components/page-skeletons";
import { Suspense } from "react";
import { LogoutButton } from "./_components/logout-button";
import { ProfileDetails } from "./_components/profile-details";

export default function ProfilePage() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Mi perfil</h1>
        <p className="text-muted-foreground">
          Consultá los datos de tu cuenta.
        </p>
      </header>
      <section
        aria-labelledby="account-details"
        className="flex flex-col gap-6 rounded-xl border bg-card p-5 sm:p-6"
      >
        <h2 id="account-details" className="text-lg font-semibold">
          Datos personales
        </h2>
        <Suspense fallback={<ProfileDetailsLoading />}>
          <ProfileDetails />
        </Suspense>
      </section>
      <div className="self-start">
        <LogoutButton />
      </div>
    </section>
  );
}
