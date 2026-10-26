interface PublicListerListing {
  id: string;
  title: string;
  location: string;
}

interface PublicLister {
  id: string;
  name: string;
  type: "agent" | "owner";
  listings: PublicListerListing[];
}

type ListerSearchMode = "location" | "name";

function filterPublicListers(listers: PublicLister[], mode: ListerSearchMode, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return listers
    .map((lister) => ({
      ...lister,
      listings: mode === "location"
        ? lister.listings.filter((listing) => listing.location.toLocaleLowerCase().includes(normalizedQuery))
        : lister.listings,
    }))
    .filter((lister) => lister.listings.length > 0 && (mode !== "name" || lister.name.toLocaleLowerCase().includes(normalizedQuery)));
}

export { filterPublicListers };
export type { ListerSearchMode, PublicLister, PublicListerListing };
