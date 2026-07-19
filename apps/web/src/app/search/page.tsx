import { ItemSearchBox } from "@/components/items/ItemSearchBox";

export default function SearchPage() {
  return <main className="section container"><p className="eyebrow">Item catalog</p><h1>품목 이름으로 배출 방법 찾기</h1><p className="muted">이름이 정확하지 않아도 별칭과 유사한 표현을 함께 찾아드립니다.</p><ItemSearchBox /></main>;
}
