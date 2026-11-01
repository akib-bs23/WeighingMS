/**
 * `UNVERIFIED`: never scanned, or only a non-dyestuff code scanned — confirmation is still
 * allowed (story 007 AC4, light verification). `VERIFIED`: the active component's own barcode
 * was scanned. `MISMATCH`: a different dyestuff's barcode was scanned while this component is
 * active — blocks confirmation (even in tolerance) until cleared by a correct scan or Quit.
 */
export type IdentityStatus = 'UNVERIFIED' | 'VERIFIED' | 'MISMATCH';
