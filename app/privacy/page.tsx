import type { Metadata } from "next";
import { PrivacyPolicyView } from "@/components/legal/privacy-policy-view";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How AuroraFlix collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return <PrivacyPolicyView />;
}
