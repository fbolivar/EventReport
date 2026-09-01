import { ButtonLink } from "@/components/shared/button";

/**
 * The PDF lives in a private bucket, so the link is minted on demand by a
 * route handler that checks the session and signs a short-lived URL.
 */
export function ReportDownload({ reportId }: { reportId: string }) {
  return (
    <ButtonLink href={`/api/reports/${reportId}`} variant="secondary" size="sm" prefetch={false}>
      Descargar PDF
    </ButtonLink>
  );
}
