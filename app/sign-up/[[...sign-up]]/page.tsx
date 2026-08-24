import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-background px-4 py-12">
      <SignUp />
    </div>
  );
}
