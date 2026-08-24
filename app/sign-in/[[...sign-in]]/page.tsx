import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-background px-4 py-12">
      <SignIn />
    </div>
  );
}
