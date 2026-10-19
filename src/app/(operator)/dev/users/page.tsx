import UsersView from "./view";

export const metadata = { title: "Users · Kitsu dev" };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q ?? "";
  return <UsersView initialQuery={query.slice(0, 100)} />;
}
