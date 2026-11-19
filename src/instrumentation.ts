/** Runs once when the server starts: refuse to boot with a bad configuration. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { configErrors, config } = await import("@/lib/server/config");
  const { log } = await import("@/lib/server/log");

  const errors = configErrors();
  if (errors.length) {
    for (const e of errors) log.error(`config: ${e}`);
    if (config.isProd) {
      log.error("refusing to start with invalid configuration");
      process.exit(1);
    }
  }
  log.info("hosted page starting", {
    platformApiUrl: config.platformApiUrl,
    mockPlatform: config.mockPlatform,
    languageToggle: config.languageToggle,
  });
}
