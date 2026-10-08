export function ownerUserId(): number | null {
  const value = process.env.KITSU_OWNER_USER_ID ?? "";
  if (!/^\d+$/.test(value)) return null;
  const userId = Number(value);
  return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
}

export function isOwnerUser(userId: number): boolean {
  return ownerUserId() === userId;
}
