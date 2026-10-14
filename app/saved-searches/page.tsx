import type { Metadata } from "next";
import { SavedSearches } from "@/components/web/saved-searches";

export const metadata: Metadata = { title: "Saved searches | A7 Property", robots: { index: false, follow: false } };
export default function SavedSearchesPage() { return <SavedSearches />; }
