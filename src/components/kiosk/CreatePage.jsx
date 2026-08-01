import { KioskForm } from "./KioskForm";
import { PageFooter } from "../layout/PageFooter";
import { C, pageBackground } from "../../lib/theme";

const createPageStyle = {
  width: "min(100%, 520px)",
};

export function CreatePage({ ticketIssuer, desks, services, labels, theme }) {
  const appearance = {
    accentColor: theme?.accentColor || C.amber,
    bgColor: theme?.bgColor || C.ink900,
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.ink600,
    radius: Number(theme?.radius) || 8,
    currency: theme?.currency || "USD",
  };

  return (
    <main
      className="qp-page-shell qp-kiosk-page-shell qp-ticket-page-shell py-6 sm:py-8"
      style={{ backgroundColor: pageBackground(appearance), color: appearance.fontColor }}
    >
      <section className="qp-kiosk-panel qp-ticket-page-content" style={createPageStyle}>
        <KioskForm
          theme={appearance}
          form={ticketIssuer.form}
          setForm={ticketIssuer.setForm}
          formError={ticketIssuer.formError}
          setFormError={ticketIssuer.setFormError}
          formErrors={ticketIssuer.formErrors}
          setFormErrors={ticketIssuer.setFormErrors}
          desks={desks}
          services={services}
          serviceWord={labels.serviceWord}
          onIssue={ticketIssuer.handleIssue}
          issueStep={ticketIssuer.issueStep}
          advanceIssueStep={ticketIssuer.advanceIssueStep}
          setIssueStep={ticketIssuer.setIssueStep}
          issuePending={ticketIssuer.issuePending}
        />
      </section>
      <PageFooter color={`${appearance.fontColor}66`} className="qp-ticket-page-footer pt-3" />
    </main>
  );
}
