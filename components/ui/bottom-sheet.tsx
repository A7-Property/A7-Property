import { Sheet, type SheetProps } from "@/components/ui/sheet";

type BottomSheetProps = Omit<SheetProps, "side">;

function BottomSheet(props: BottomSheetProps) {
  return <Sheet {...props} side="bottom" />;
}

export { BottomSheet };
export type { BottomSheetProps };
