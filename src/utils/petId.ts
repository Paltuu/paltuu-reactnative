// Shared helpers for the pet ID card and the pet-profile About tab — kept
// separate so both can format the same fields identically without drifting.

/**
 * CNIC-style identity number: the pet_profile_id left-padded to 13 digits,
 * formatted XXXXX-XXXXXXX-X. e.g. 77 -> "00000-0000007-7"
 */
export const formatPetIdentityNumber = (petProfileId: number): string => {
  const padded = String(petProfileId).padStart(13, '0');
  return `${padded.slice(0, 5)}-${padded.slice(5, 12)}-${padded.slice(12)}`;
};

/** CNIC dot format: DD.MM.YYYY */
export const formatCardDate = (date: string | Date | null): string | null => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
};

/** Date of expiry = date of issue + 10 years, in CNIC dot format. */
export const formatCardExpiry = (issueDate: string | null): string | null => {
  if (!issueDate) return null;
  const d = new Date(issueDate);
  if (isNaN(d.getTime())) return null;
  d.setFullYear(d.getFullYear() + 10);
  return formatCardDate(d);
};

export const formatDOB = (dob: string | null): string | null => {
  if (!dob) return null;
  const d = new Date(dob);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};
