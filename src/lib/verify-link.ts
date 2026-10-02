/** The "Are you this artist?" link is for signed-in scouts, and only while the page is unverified. */
export function canOfferVerify(signedIn: boolean, verifiedAt: string | null): boolean {
  return signedIn && !verifiedAt;
}
