/**
 * UI copy (Figma: "Current direction — Bhutan NDI hosted page"). Placeholders in
 * {braces} are filled by <Fmt>:
 *   {brand}    "Bhutan NDI" in the accent colour   {host} the relying party's return host (DL-009)
 *   {scan}     the wallet's scan-button image       {download} the "Download Now!" link
 *
 * The page shows NDI branding and the return host only — never an organisation name (DL-009).
 * NOTE: Dzongkha copy must be reviewed by a native speaker / DDC before launch (DL-010).
 */

export const LANGS = ["en", "dz"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "ndi_lang";

export const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang);

export interface Messages {
  languageLabel: string;
  langShort: Record<Lang, string>;
  logoAlt: string;
  returnLine: string;

  // Phone: "Continue" opens the wallet, QR code available (HVP-SD §5.6)
  continueTitle: string;
  continue: string;
  opening: string;
  walletDidNotOpen: string;
  tryAgain: string;
  useQr: string;
  hideQr: string;

  // Desktop: QR code first (HVP-SD §5.6)
  scanTitle: string;
  stepOpenWallet: string;
  stepTapScan: string;
  scanButtonAlt: string;
  qrTitle: string;
  openOnThisPhone: string;

  // Scanned (DL-016) — never "Verifying your details": nothing is approved yet
  scanned: string;
  scannedBody: string;

  noApp: string;
  downloadNow: string;
  getItOnGooglePlay: string;
  downloadOnAppStore: string;
  support: string;
  watchGuide: string;

  loadingTitle: string;
  loadingBody: string;

  // After the deep link (DL-007)
  waitingTitle: string;
  waitingBody: string;
  returnedTitle: string;
  returnedBody: string;

  // Completed (cross-device)
  doneTitle: string;
  returningBody: string;
  returnTo: string;

  declinedTitle: string;
  declinedBody: string;
  failedTitle: string;
  failedBody: string;
  expiredTitle: string;
  expiredBody: string;
  startAgainAt: string;
  cancelReturn: string;
  timedOutTitle: string;
  timedOutBody: string;
  notFoundTitle: string;
  notFoundBody: string;
  goneBody: string;
  reconnectingTitle: string;
  reconnectingBody: string;

  errorTitle: string;
  errorBody: string;
  reload: string;
}

const en: Messages = {
  languageLabel: "Language",
  langShort: { en: "EN", dz: "རྫོང་ཁ" },
  logoAlt: "Bhutan NDI Wallet",
  returnLine: "You'll return to {host}",

  continueTitle: "Continue with {brand} Wallet",
  continue: "Continue",
  opening: "Opening Bhutan NDI Wallet…",
  walletDidNotOpen: "The wallet didn't open.",
  tryAgain: "Try again",
  useQr: "Use QR code instead",
  hideQr: "Hide QR code",

  scanTitle: "Scan with {brand} Wallet",
  stepOpenWallet: "Open Bhutan NDI Wallet on your phone",
  stepTapScan: "Tap the scan button {scan} and scan this QR code",
  scanButtonAlt: "scan",
  qrTitle: "Scan with Bhutan NDI Wallet",
  openOnThisPhone: "On this phone? Open the app",

  scanned: "Scanned",
  scannedBody: "Accept or decline in your Bhutan NDI app.",

  noApp: "Don't have the Bhutan NDI Wallet? {download}",
  downloadNow: "Download Now!",
  getItOnGooglePlay: "Get it on Google Play",
  downloadOnAppStore: "Download on the App Store",
  support: "Get Support",
  watchGuide: "Watch video guide",

  loadingTitle: "Just a moment",
  loadingBody: "Preparing your request.",

  waitingTitle: "Accept or decline in the Bhutan NDI app",
  waitingBody: "The app didn't open or didn't bring you back? To try again, start from {host}.",
  returnedTitle: "All done here",
  returnedBody: "Your service should have opened in another tab. If it didn't, return to {host}.",

  doneTitle: "Done",
  returningBody: "Returning you to {host}…",
  returnTo: "Return to {host}",

  declinedTitle: "You declined the request",
  declinedBody: "Nothing was shared. To try again, start from {host}.",
  failedTitle: "We could not complete the check",
  failedBody: "The check did not finish. To try again, start from {host}.",
  expiredTitle: "This request has expired",
  expiredBody: "Each request is only valid for a limited time. To try again, start from {host}.",
  startAgainAt: "Start again at {host}",
  cancelReturn: "Cancel and return to {host}",
  timedOutTitle: "You did not approve in time",
  timedOutBody: "The request was not answered in time. To try again, start from {host}.",
  notFoundTitle: "This request is no longer available",
  notFoundBody: "This link has already been used, or it is too old. To try again, start from the service you were using.",
  goneBody: "If you approved it in the app, continue at {host}. If not, start again from there.",
  reconnectingTitle: "Reconnecting…",
  reconnectingBody: "We have lost connection to Bhutan NDI. Your request is still valid and this page will keep trying.",

  errorTitle: "Something went wrong",
  errorBody: "Please try again. If the problem continues, contact support.",
  reload: "Try again",
};

const dz: Messages = {
  languageLabel: "སྐད་ཡིག",
  langShort: en.langShort,
  logoAlt: "Bhutan NDI ཝོ་ལེཊི།",
  returnLine: "ཁྱོད་ {host} ལུ་ ལོག་འོང་།",

  continueTitle: "{brand} ཝོ་ལེཊི་ཐོག་ལས་ འཕྲོ་མཐུད།",
  continue: "འཕྲོ་མཐུད།",
  opening: "Bhutan NDI ཝོ་ལེཊི་ ཁ་ཕྱེ་དོ།",
  walletDidNotOpen: "ཝོ་ལེཊི་ ཁ་མ་ཕྱེ།",
  tryAgain: "ལོག་འབད་རྩོལ་བསྐྱེད།",
  useQr: "དེ་འབདཝ་ད་ QR ཨང་རྟགས་ ལག་ལེན་འཐབ།",
  hideQr: "QR ཨང་རྟགས་ སྦ།",

  scanTitle: "{brand} ཝོ་ལེཊི་གིས་ སྐེན་འབད།",
  stepOpenWallet: "ཁྱོད་ཀྱི་ བརྒྱུད་འཕྲིན་ཐོག་ Bhutan NDI ཝོ་ལེཊི་ ཁ་ཕྱེ།",
  stepTapScan: "སྐེན་གྱི་ཨེབ་རྟ {scan} ལུ་ ཨེབ་སྟེ་ QR ཨང་རྟགས་འདི་ སྐེན་འབད།",
  scanButtonAlt: "སྐེན།",
  qrTitle: "Bhutan NDI ཝོ་ལེཊི་གིས་ སྐེན་འབད།",
  openOnThisPhone: "བརྒྱུད་འཕྲིན་འདི་ཐོག་ཨིན་ན? གློག་རིམ་ ཁ་ཕྱེ།",

  scanned: "སྐེན་འབད་ཡི།",
  scannedBody: "ཁྱོད་ཀྱི་ Bhutan NDI གློག་རིམ་ནང་ ཁས་ལེན་ ཡང་ན་ ཁས་མ་ལེན་འབད།",

  noApp: "Bhutan NDI ཝོ་ལེཊི་ མེད་ག? {download}",
  downloadNow: "ད་ལྟོ་ ཕབ་ལེན་འབད།",
  getItOnGooglePlay: en.getItOnGooglePlay,
  downloadOnAppStore: en.downloadOnAppStore,
  support: "རྒྱབ་སྐྱོར་",
  watchGuide: "བརྙན་འཁོར་ལམ་སྟོན་ བལྟ།",

  loadingTitle: "སྐར་མ་ཅིག་ བསྒུག",
  loadingBody: "ཁྱོད་ཀྱི་ཞུ་བ་ གྲ་སྒྲིག་འབད་དོ།",

  waitingTitle: "Bhutan NDI གློག་རིམ་ནང་ ཁས་ལེན་ ཡང་ན་ ཁས་མ་ལེན་འབད།",
  waitingBody: "གློག་རིམ་ ཁ་མ་ཕྱེ་ ཡང་ན་ ཁྱོད་ ལོག་མ་གཏང་ཡི་ག? ལོག་འབད་རྩོལ་བསྐྱེད་ནིའི་དོན་ལུ་ {host} ལས་ འགོ་བཙུགས།",
  returnedTitle: "ནཱ་ལུ་ ཚར་ཡི།",
  returnedBody: "ཁྱོད་ཀྱི་ ཞབས་ཏོག་ ཤོག་ཁྲམ་གཞན་ཅིག་ནང་ ཁ་ཕྱེ་དགོཔ་ཨིན། མ་ཕྱེ་བ་ཅིན་ {host} ལུ་ལོག",

  doneTitle: "ཚར་ཡི།",
  returningBody: "ཁྱོད་ {host} ལུ་ ལོག་གཏང་དོ།",
  returnTo: "{host} ལུ་ལོག",

  declinedTitle: "ཁྱོད་ཀྱིས་ ཞུ་བ་ ཁས་མ་བླངས།",
  declinedBody: "ག་ནི་ཡང་ བརྗེ་སོར་མ་འབད། ལོག་འབད་རྩོལ་བསྐྱེད་ནིའི་དོན་ལུ་ {host} ལས་ འགོ་བཙུགས།",
  failedTitle: "བདེན་དཔྱད་ མཇུག་བསྡུ་མ་ཚུགས།",
  failedBody: "བདེན་དཔྱད་ མཇུག་མ་བསྡུ། ལོག་འབད་རྩོལ་བསྐྱེད་ནིའི་དོན་ལུ་ {host} ལས་ འགོ་བཙུགས།",
  expiredTitle: "ཞུ་བ་འདི་ དུས་ཡོལ་ཡི།",
  expiredBody: "ཞུ་བ་རེ་རེ་ དུས་ཚོད་ཚད་ཡོད་ཅིག་གི་རིང་རྐྱངམ་ཅིག་ ནུས་ཅན་ཨིན། ལོག་འབད་རྩོལ་བསྐྱེད་ནིའི་དོན་ལུ་ {host} ལས་ འགོ་བཙུགས།",
  startAgainAt: "{host} ལུ་ ལོག་སྟེ་ འགོ་བཙུགས།",
  cancelReturn: "ཆ་མེད་གཏང་སྟེ་ {host} ལུ་ལོག",
  timedOutTitle: "ཁྱོད་ཀྱིས་ དུས་ཚོད་ནང་ ཆོག་མཆན་མ་བྱིན།",
  timedOutBody: "ཞུ་བ་ལུ་ དུས་ཚོད་ནང་ ལན་མ་བྱིན། ལོག་འབད་རྩོལ་བསྐྱེད་ནིའི་དོན་ལུ་ {host} ལས་ འགོ་བཙུགས།",
  notFoundTitle: "ཞུ་བ་འདི་ ད་ལྟོ་ མིན་འདུག",
  notFoundBody: "འབྲེལ་མཐུད་འདི་ ལག་ལེན་འཐབ་ཚར་ཡི་ ཡང་ན་ རྙིངམ་ཨིན། ལོག་འབད་རྩོལ་བསྐྱེད་ནིའི་དོན་ལུ་ ཁྱོད་ཀྱིས་ ལག་ལེན་འཐབ་མི་ ཞབས་ཏོག་ལས་ འགོ་བཙུགས།",
  goneBody: "གློག་རིམ་ནང་ ཆོག་མཆན་བྱིན་ཡོད་པ་ཅིན་ {host} ལུ་ འཕྲོ་མཐུད། མེད་པ་ཅིན་ དེ་ལས་ ལོག་སྟེ་ འགོ་བཙུགས།",
  reconnectingTitle: "ལོག་མཐུད་དོ།",
  reconnectingBody: "Bhutan NDI དང་ མཐུད་ལམ་ ཆད་ཡི། ཁྱོད་ཀྱི་ཞུ་བ་ ད་ལྟོ་ཡང་ ནུས་ཅན་ཨིན་ ཤོག་ངོས་འདི་གིས་ འབད་རྩོལ་བསྐྱེད་དེ་ར་ སྡོད་འོང་།",

  errorTitle: "དཀའ་ངལ་ཅིག་ བྱུང་ཡི།",
  errorBody: "ལོག་འབད་རྩོལ་བསྐྱེད། དཀའ་ངལ་ མཇུག་མ་བསྡུ་བ་ཅིན་ རྒྱབ་སྐྱོར་ལུ་ འབྲེལ་བ་འཐབ།",
  reload: "ལོག་འབད་རྩོལ་བསྐྱེད།",
};

export const messages: Record<Lang, Messages> = { en, dz };
