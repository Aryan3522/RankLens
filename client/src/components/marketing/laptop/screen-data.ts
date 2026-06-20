/**
 * Plain data shape passed into the laptop screen components. The screens render
 * inside the drei <Html> overlay, which sits in the R3F reconciler and loses the
 * app's context providers (TanStack Query etc.) — so screens must be pure and
 * receive their data as props rather than calling data hooks themselves. The
 * stage fetches the latest analysis (in the DOM tree, with context) and passes
 * the relevant fields down.
 */
export type ScreenData = {
  seoScore?: number;
  aiVisibilityScore?: number;
};
