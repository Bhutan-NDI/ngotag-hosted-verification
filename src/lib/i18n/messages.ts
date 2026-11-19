/**
 * UI copy. Placeholders in {braces} are filled by <Fmt>:
 *   {brand}   "Bhutan NDI" in the accent colour
 *   {partner} partner display name     {host}  partner hostname
 *   {scan}    scan icon
 *
 * NOTE: Dzongkha copy must be reviewed by a native speaker / DDC before launch.
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
  requester: string;
  returnLine: string;

  continueTitle: string;
  continue: string;
  opening: string;
  tryAgain: string;
  useQr: string;
  hideQr: string;
  stillOpeningTitle: string;
  stillOpeningBody: string;

  scanTitle: string;
  stepOpenOnPhone: string;
  stepOpenOnOtherPhone: string;
  stepTapScan: string;
  stepScanThisCode: string;
  stepApprove: string;
  openOnThisPhone: string;
  codeExpiresIn: string;
  approveWithin: string;
  qrTitle: string;

  scanned: string;
  scannedBody: string;
  waitingApproval: string;

  noApp: string;
  getItOnGooglePlay: string;
  downloadOnAppStore: string;
  support: string;
  watchGuide: string;

  loadingTitle: string;
  loadingBody: string;

  waitingTitle: string;
  waitingBody: string;
  waitingResponse: string;
  openWallet: string;
  cancelReturn: string;

  doneTitle: string;
  returningBody: string;
  notRedirected: string;
  doneElsewhereTitle: string;
  doneElsewhereBody: string;
  returnTo: string;

  declinedTitle: string;
  declinedBody: string;
  failedTitle: string;
  failedBody: string;
  expiredTitle: string;
  expiredBody: string;
  startAgain: string;
  timedOutTitle: string;
  timedOutBody: string;
  notFoundTitle: string;
  notFoundBody: string;
  reconnectingTitle: string;
  reconnectingBody: string;
  unavailableBody: string;

  errorTitle: string;
  errorBody: string;
  reload: string;
}

const en: Messages = {
  languageLabel: "Language",
  langShort: { en: "EN", dz: "རྫོང་ཁ" },
  logoAlt: "Bhutan NDI",
  requester: "{partner} wants to verify your identity.",
  returnLine: "You'll return to {host}",

  continueTitle: "Continue with {brand} Wallet",
  continue: "Continue",
  opening: "Opening Bhutan NDI Wallet…",
  tryAgain: "Try again",
  useQr: "Use a QR code instead",
  hideQr: "Hide QR code",
  stillOpeningTitle: "Still opening…",
  stillOpeningBody: "If the wallet didn't open, make sure it's installed and try again — or use a QR code.",

  scanTitle: "Scan with {brand} Wallet",
  stepOpenOnPhone: "Open the {brand} Wallet on your phone",
  stepOpenOnOtherPhone: "Open the {brand} Wallet on another phone",
  stepTapScan: "Tap {scan} and scan this code",
  stepScanThisCode: "Tap the scan icon and scan this code",
  stepApprove: "Review and approve the request in the app",
  openOnThisPhone: "On this phone? Open the app",
  codeExpiresIn: "Code expires in",
  approveWithin: "Approve within",
  qrTitle: "Scan with Bhutan NDI Wallet",

  scanned: "Scanned",
  scannedBody: "Approve the request in the {brand} Wallet to continue.",
  waitingApproval: "Waiting for approval…",

  noApp: "Don't have the {brand} Wallet?",
  getItOnGooglePlay: "Get it on Google Play",
  downloadOnAppStore: "Download on the App Store",
  support: "Get Support",
  watchGuide: "Watch video guide",

  loadingTitle: "Just a moment",
  loadingBody: "Preparing your request…",

  waitingTitle: "Accept or decline in the {brand} app",
  waitingBody: "Once you respond in the wallet, we'll bring you back to {host} automatically.",
  waitingResponse: "Waiting for your response…",
  openWallet: "Open Bhutan NDI Wallet",
  cancelReturn: "Cancel and return to {host}",

  doneTitle: "Done",
  returningBody: "Returning you to {host}…",
  notRedirected: "Not redirected? Continue",
  doneElsewhereTitle: "All done here",
  doneElsewhereBody: "You finished verifying in another window. You can close this tab.",
  returnTo: "Return to {host}",

  declinedTitle: "You declined the request",
  declinedBody: "No details were shared with {partner}.",
  failedTitle: "We could not complete the check",
  failedBody:
    "Your credentials couldn't be verified. Return to the service to try again, or contact support if this keeps happening.",
  expiredTitle: "This request has expired",
  expiredBody: "For your security, requests are only valid for a few minutes. Start again to get a new one.",
  startAgain: "Start again",
  timedOutTitle: "You did not approve in time",
  timedOutBody: "The request was scanned but not approved in the wallet in time. Start again to get a new request.",
  notFoundTitle: "This request is no longer available",
  notFoundBody: "The link may be incorrect or already used. Go back to the service you came from and start again.",
  reconnectingTitle: "Reconnecting…",
  reconnectingBody: "We lost the connection. Keep this page open — your request is still active.",
  unavailableBody: "It was cancelled or finished somewhere else. Return to {host} to start again.",

  errorTitle: "Something went wrong",
  errorBody: "Please try again. If the problem continues, contact support.",
  reload: "Try again",
};

const dz: Messages = {
  languageLabel: "སྐད་ཡིག",
  langShort: en.langShort,
  logoAlt: "Bhutan NDI",
  requester: "{partner} གིས་ ཁྱོད་ཀྱི་ངོ་རྟགས་ བདེན་དཔྱད་འབད་ནི་ཨིན།",
  returnLine: "ཁྱོད་ {host} ལུ་ ལོག་འོང་།",

  continueTitle: "{brand} ཝོ་ལེཊི་ཐོག་ལས་ འཕྲོ་མཐུད།",
  continue: "འཕྲོ་མཐུད།",
  opening: "Bhutan NDI ཝོ་ལེཊི་ ཁ་ཕྱེ་དོ།",
  tryAgain: "ལོག་འབད་རྩོལ་བསྐྱེད།",
  useQr: "དེ་འབདཝ་ད་ QR ཨང་རྟགས་ ལག་ལེན་འཐབ།",
  hideQr: "QR ཨང་རྟགས་ སྦ།",
  stillOpeningTitle: "ད་ལྟོ་ཡང་ ཁ་ཕྱེ་དོ།",
  stillOpeningBody:
    "ཝོ་ལེཊི་ ཁ་མ་ཕྱེ་བ་ཅིན་ གཞི་བཙུགས་འབད་ཡོདཔ་ ངེས་གཏན་བཟོ་སྟེ་ ལོག་འབད་རྩོལ་བསྐྱེད། ཡང་ན་ QR ཨང་རྟགས་ ལག་ལེན་འཐབ།",

  scanTitle: "{brand} ཝོ་ལེཊི་གིས་ སྐེན་འབད།",
  stepOpenOnPhone: "ཁྱོད་ཀྱི་ བརྒྱུད་འཕྲིན་ཐོག་ {brand} ཝོ་ལེཊི་ ཁ་ཕྱེ།",
  stepOpenOnOtherPhone: "བརྒྱུད་འཕྲིན་གཞན་ཅིག་གི་ཐོག་ {brand} ཝོ་ལེཊི་ ཁ་ཕྱེ།",
  stepTapScan: "{scan} ལུ་ ཨེབ་སྟེ་ ཨང་རྟགས་འདི་ སྐེན་འབད།",
  stepScanThisCode: "སྐེན་གྱི་མཚོན་རྟགས་ལུ་ ཨེབ་སྟེ་ ཨང་རྟགས་འདི་ སྐེན་འབད།",
  stepApprove: "ཞུ་བ་འདི་ གློག་རིམ་ནང་ བལྟ་ཞིབ་འབད་དེ་ ཆོག་མཆན་བྱིན།",
  openOnThisPhone: "བརྒྱུད་འཕྲིན་འདི་ཐོག་ཨིན་ན? གློག་རིམ་ ཁ་ཕྱེ།",
  codeExpiresIn: "ཨང་རྟགས་ དུས་ཡོལ་ནི་ལུ་",
  approveWithin: "ཆོག་མཆན་བྱིན་ནིའི་ དུས་ཚོད་",
  qrTitle: "Bhutan NDI ཝོ་ལེཊི་གིས་ སྐེན་འབད།",

  scanned: "སྐེན་འབད་ཡི།",
  scannedBody: "འཕྲོ་མཐུད་ནིའི་དོན་ལུ་ {brand} ཝོ་ལེཊི་ནང་ ཞུ་བ་ལུ་ ཆོག་མཆན་བྱིན།",
  waitingApproval: "ཆོག་མཆན་ལུ་ བསྒུག་དོ།",

  noApp: "{brand} ཝོ་ལེཊི་ མེད་ག?",
  getItOnGooglePlay: en.getItOnGooglePlay,
  downloadOnAppStore: en.downloadOnAppStore,
  support: "རྒྱབ་སྐྱོར་",
  watchGuide: "བརྙན་འཁོར་ལམ་སྟོན་ བལྟ།",

  loadingTitle: "སྐར་མ་ཅིག་ བསྒུག",
  loadingBody: "ཁྱོད་ཀྱི་ཞུ་བ་ གྲ་སྒྲིག་འབད་དོ།",

  waitingTitle: "{brand} གློག་རིམ་ནང་ ངོས་ལེན་ ཡང་ན་ ཁས་མ་བླངས།",
  waitingBody: "ཝོ་ལེཊི་ནང་ ལན་སློག་པའི་ཤུལ་ལས་ ཁྱོད་ {host} ལུ་ རང་བཞིན་གྱིས་ ལོག་གཏང་འོང་།",
  waitingResponse: "ཁྱོད་ཀྱི་ལན་ལུ་ བསྒུག་དོ།",
  openWallet: "Bhutan NDI ཝོ་ལེཊི་ ཁ་ཕྱེ།",
  cancelReturn: "ཆ་མེད་གཏང་སྟེ་ {host} ལུ་ལོག",

  doneTitle: "ཚར་ཡི།",
  returningBody: "ཁྱོད་ {host} ལུ་ ལོག་གཏང་དོ།",
  notRedirected: "ལོག་མ་འགྱོ་བ་ཅིན་ འཕྲོ་མཐུད།",
  doneElsewhereTitle: "ནཱ་ལུ་ ཆ་མཉམ་ ཚར་ཡི།",
  doneElsewhereBody: "སྒོ་སྒྲིག་གཞན་ཅིག་ནང་ བདེན་དཔྱད་ ཚར་ཡི། ཤོག་ངོས་འདི་ ཁ་བསྡམས་ཆོག",
  returnTo: "{host} ལུ་ལོག",

  declinedTitle: "ཁྱོད་ཀྱིས་ ཞུ་བ་ ཁས་མ་བླངས།",
  declinedBody: "{partner} དང་གཅིག་ཁར་ ཁ་གསལ་ག་ནི་ཡང་ བགོ་བཤའ་མ་རྐྱབ།",
  failedTitle: "བདེན་དཔྱད་ མཇུག་བསྡུ་མ་ཚུགས།",
  failedBody:
    "ཁྱོད་ཀྱི་ ངོ་སྤྲོད་ཡིག་ཆ་ བདེན་དཔྱད་འབད་མ་ཚུགས། ལོག་འབད་རྩོལ་བསྐྱེད་ནིའི་དོན་ལུ་ ཞབས་ཏོག་ལུ་ལོག ཡང་ན་ འདི་བཟུམ་ ཡང་བསྐྱར་བྱུང་པ་ཅིན་ རྒྱབ་སྐྱོར་ལུ་ འབྲེལ་བ་འཐབ།",
  expiredTitle: "ཞུ་བ་འདི་ དུས་ཡོལ་ཡི།",
  expiredBody:
    "ཁྱོད་ཀྱི་ ཉེན་སྲུང་གི་དོན་ལུ་ ཞུ་བ་ཚུ་ སྐར་མ་ཁ་ཙམ་གི་རིང་རྐྱངམ་ཅིག་ ནུས་ཅན་ཨིན། གསརཔ་ཅིག་ འཐོབ་ནིའི་དོན་ལུ་ ལོག་སྟེ་ འགོ་བཙུགས།",
  startAgain: "ལོག་སྟེ་ འགོ་བཙུགས།",
  timedOutTitle: "ཁྱོད་ཀྱིས་ དུས་ཚོད་ནང་ ཆོག་མཆན་མ་བྱིན།",
  timedOutBody:
    "ཞུ་བ་འདི་ སྐེན་འབད་ཡོད་རུང་ དུས་ཚོད་ནང་ ཝོ་ལེཊི་ནང་ ཆོག་མཆན་མ་བྱིན། ཞུ་བ་གསརཔ་ཅིག་ འཐོབ་ནིའི་དོན་ལུ་ ལོག་སྟེ་ འགོ་བཙུགས།",
  notFoundTitle: "ཞུ་བ་འདི་ ད་ལྟོ་ འཐོབ་མི་ཚུགས།",
  notFoundBody:
    "འབྲེལ་མཐུད་འདི་ བདེན་མེད་ ཡང་ན་ ཧེ་མ་ལས་ ལག་ལེན་འཐབ་ཚར་ཡོདཔ་འོང་། ཁྱོད་ ག་ཏེ་ལས་འོངམ་ཨིན་ན་ ཞབས་ཏོག་དེ་ལུ་ ལོག་སྟེ་ འགོ་བཙུགས།",
  reconnectingTitle: "ལོག་མཐུད་དོ།",
  reconnectingBody: "མཐུད་ལམ་ ཆད་ཡི། ཤོག་ངོས་འདི་ ཁ་ཕྱེ་སྟེ་བཞག ཁྱོད་ཀྱི་ཞུ་བ་ ད་ལྟོ་ཡང་ ནུས་ཅན་ཨིན།",
  unavailableBody: "འདི་ ས་གནས་གཞན་ཅིག་ནང་ ཆ་མེད་གཏང་ཡོདཔ་ ཡང་ན་ ཚར་ཡོདཔ་ཨིན། ལོག་སྟེ་ འགོ་བཙུགས་ནིའི་དོན་ལུ་ {host} ལུ་ལོག",

  errorTitle: "དཀའ་ངལ་ཅིག་ བྱུང་ཡི།",
  errorBody: "ལོག་འབད་རྩོལ་བསྐྱེད། དཀའ་ངལ་ མཇུག་མ་བསྡུ་བ་ཅིན་ རྒྱབ་སྐྱོར་ལུ་ འབྲེལ་བ་འཐབ།",
  reload: "ལོག་འབད་རྩོལ་བསྐྱེད།",
};

export const messages: Record<Lang, Messages> = { en, dz };
