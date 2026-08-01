import Image from "next/image";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-brand-teal-dark px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image src="/images/logo.png" alt="RelixCore" width={72} height={72} priority />
          <div>
            <h1 className="text-lg font-semibold text-brand-teal-dark">RelixCore Ops</h1>
            <p className="text-sm text-foreground/60">Sign in to your operations dashboard</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
