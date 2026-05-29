// lib/mlSellers.ts — resolve seller nicknames (catalog items only return seller_id)

import type { MLItem } from "@/types/mercadolibre";
import { mlFetch } from "@/lib/mlServer";

const nicknameCache = new Map<number, string>();

async function fetchSellerNickname(sellerId: number): Promise<string | undefined> {
  const cached = nicknameCache.get(sellerId);
  if (cached) return cached;

  const res = await mlFetch(`/users/${sellerId}`);
  if (!res.ok) return undefined;

  const user: { nickname?: string } = await res.json();
  if (!user.nickname) return undefined;

  nicknameCache.set(sellerId, user.nickname);
  return user.nickname;
}

export async function enrichItemsWithSellerNames(
  items: MLItem[]
): Promise<MLItem[]> {
  const sellerIds = [
    ...new Set(
      items
        .map((i) => i.seller_id)
        .filter((id): id is number => id != null)
    ),
  ];

  await Promise.all(sellerIds.map((id) => fetchSellerNickname(id)));

  return items.map((item) => {
    const nickname =
      item.seller_nickname ??
      item.seller?.nickname ??
      (item.seller_id != null ? nicknameCache.get(item.seller_id) : undefined);

    return nickname
      ? { ...item, seller_nickname: nickname }
      : item;
  });
}
