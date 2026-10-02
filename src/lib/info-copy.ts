import { ACCOUNT_MIN_AGE_DAYS } from "./scoring";

/** Text for the InfoTip explanations, kept in one place so every screen says the same thing. */
export const POINTS_TIP = `Every claim earns 1 point, so you appear right away. Growth points start when your account is ${ACCOUNT_MIN_AGE_DAYS} days old.`;
export const AT_RISK_TIP = "Points from claims under 14 days old. Dropping any claim this season removes its points, so these are the ones most likely to go.";
export const LOCK_TIP = "New claims are locked for 3 days so numbers stay meaningful.";
export const PROVISIONAL_TIP = "A claim shows here as soon as it is made. Until it has been held for 14 days it is provisional and greyed. If it is dropped before day 14 it stays listed as dropped early and has no trophy value.";
export const FRIEND_TIP = `A friend counts once their account is ${ACCOUNT_MIN_AGE_DAYS} days old and they have made a claim.`;
export const REPORT_AGE_TIP = `Reports need an account that is ${ACCOUNT_MIN_AGE_DAYS} days old. This stops new accounts being used to flood a page with reports. Verified artists can report their own page at any time.`;
