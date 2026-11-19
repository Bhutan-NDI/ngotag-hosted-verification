"use client";

import { Frame, Status } from "@/components/hosted/views";
import { Asset, PrimaryButton, StatusIcon } from "@/components/hosted/ui";
import { useI18n } from "@/lib/i18n/client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <Frame>
      <Status mode="web" icon={<StatusIcon name="triangle-alert" />} title={t.errorTitle} body={t.errorBody}>
        <PrimaryButton flat onClick={reset}>
          {t.reload}
          <Asset src="rotate-cw.svg" width={20} height={20} />
        </PrimaryButton>
      </Status>
    </Frame>
  );
}
