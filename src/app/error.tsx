"use client";

import { Frame, Status } from "@/components/hosted/views";
import { Icon, PrimaryButton, StatusBadge, SupportFooter } from "@/components/hosted/ui";
import { useI18n } from "@/lib/i18n/client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <Frame mode="web">
      <Status
        badge={
          <StatusBadge tone="danger">
            <Icon.Alert className="size-6" />
          </StatusBadge>
        }
        title={t.errorTitle}
        body={t.errorBody}
        footer={<SupportFooter />}
      >
        <PrimaryButton onClick={reset}>
          {t.reload} <Icon.Retry className="size-4" />
        </PrimaryButton>
      </Status>
    </Frame>
  );
}
