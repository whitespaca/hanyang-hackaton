import { filterFindableSpotTypes, type DisposalItem } from "@bunrishot/shared";
import Link from "next/link";

export function CollectionSpotCta({ item }: { item: DisposalItem }) {
  const types = filterFindableSpotTypes(item.spotTypes);
  if (types.length === 0) return null;
  const params = new URLSearchParams({ itemId: item.id });
  for (const type of types) params.append("type", type);
  return <Link className="button button-secondary" href={`/spots?${params.toString()}`} style={{ marginTop: 18 }}>가까운 배출 장소 찾기</Link>;
}
