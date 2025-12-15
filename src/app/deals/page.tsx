// app/deals/page.tsx
import DealsClient from "./dealsClient";
import { fetchDeals, fetchOwners } from "./actions";
import { Deal } from "./types";

export default async function DealsPage() {
  // Initial load: page 1, no filters
  const initialData = await fetchDeals(null, null, null, null, 20, 1);
  const owners = (await fetchOwners()) || [];

  return (
    <DealsClient
      initialData={{
        deals: initialData.deals as unknown as Deal[],
        count: initialData.count,
        owners,
      }}
    />
  );
}
