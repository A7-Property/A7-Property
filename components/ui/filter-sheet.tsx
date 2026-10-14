import { BottomSheet, type BottomSheetProps } from "@/components/ui/bottom-sheet";

type FilterSheetProps = BottomSheetProps;

function FilterSheet(props: FilterSheetProps) {
  return <BottomSheet {...props} />;
}

export { FilterSheet };
export type { FilterSheetProps };
