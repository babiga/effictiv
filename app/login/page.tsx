import { AccountEntry } from "@/components/account-entry";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <AccountEntry error={(await searchParams).error} />;
}
