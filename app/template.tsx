import { RouteFade } from "@/components/layout/route-fade";

export default function RouteTemplate({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RouteFade>{children}</RouteFade>;
}
