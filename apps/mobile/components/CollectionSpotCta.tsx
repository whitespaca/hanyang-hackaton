import { filterFindableSpotTypes, type DisposalItem } from "@bunrishot/shared";
import { router, type Href } from "expo-router";
import { ActionButton } from "./ui";

export function CollectionSpotCta({ item }: { item: DisposalItem }) {
  const types = filterFindableSpotTypes(item.spotTypes);
  if (types.length === 0) return null;
  const href = `/spots?itemId=${encodeURIComponent(item.id)}&type=${encodeURIComponent(types.join(","))}` as Href;
  return <ActionButton label="가까운 배출 장소 찾기" variant="secondary" onPress={() => router.push(href)} />;
}
