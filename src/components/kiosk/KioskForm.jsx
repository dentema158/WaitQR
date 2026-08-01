import { useEffect, useMemo, useRef } from "react";
import { ArrowRight, Check } from "lucide-react";
import { C } from "../../lib/theme";
import { getServiceAvailability } from "../../lib/serviceAvailability";

const CURRENCY_SYMBOLS = {
  USD: "$",
  GBP: "£",
  INR: "₹",
};

function servicePriceLabel(service, currency = "USD") {
  const price = service?.price;
  if (price === "" || price == null) return "";
  return `${CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS.USD}${price}`;
}

function withAlpha(hex, alphaHex) {
  if (typeof hex !== "string" || !/^#?[0-9a-f]{6}$/i.test(hex)) return hex;
  return `${hex.startsWith("#") ? hex : `#${hex}`}${alphaHex}`;
}

export function KioskForm({
  theme,
  form,
  setForm,
  formError,
  setFormError,
  formErrors,
  setFormErrors,
  desks,
  services,
  serviceWord,
  onIssue,
  issueStep,
  advanceIssueStep,
  setIssueStep,
  issuePending,
}) {
  const appearance = {
    accentColor: theme?.accentColor || C.amber,
    bgColor: theme?.bgColor || C.ink900,
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.ink600,
    radius: Number(theme?.radius) || 8,
    currency: theme?.currency || "USD",
  };
  const fieldBackground = appearance.bgColor;
  const panelBackground = appearance.bgColor;
  const mutedText = withAlpha(appearance.fontColor, "99");
  const phoneDigits = form.phone.trim().replace(/\D/g, "");
  const fieldStyle = {
    background: fieldBackground,
    border: `1px solid ${appearance.borderColor}`,
    color: appearance.fontColor,
    borderRadius: appearance.radius,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  };
  const nameInvalid = Boolean(formErrors?.name);
  const phoneInvalid = Boolean(formErrors?.phone);
  const serviceInvalid = Boolean(formErrors?.service);
  const phoneErrorText = phoneInvalid
    ? phoneDigits
      ? "Enter a valid mobile number."
      : "Mobile number is required."
    : "";
  const focusHandlers = {
    onFocus: (event) => {
      event.target.style.borderColor = appearance.accentColor;
      event.target.style.boxShadow = `0 0 0 3px ${withAlpha(appearance.accentColor, "33")}`;
    },
    onBlur: (event) => {
      event.target.style.borderColor = appearance.borderColor;
      event.target.style.boxShadow = fieldStyle.boxShadow;
    },
  };
  const serviceAvailability = useMemo(() => {
    const map = {};
    services.forEach((service) => {
      map[service.id] = getServiceAvailability(desks, service.id);
    });
    return map;
  }, [desks, services]);
  const availableServices = useMemo(
    () => services.filter((service) => serviceAvailability[service.id]?.available !== false),
    [serviceAvailability, services]
  );
  const showServiceSelection = availableServices.length > 1;
  const directJoin = !showServiceSelection;
  const serviceStepActive = issueStep === 2 && !directJoin;
  const defaultServiceId = availableServices[0]?.id || "";
  const nameInputRef = useRef(null);
  const stepTitle = issueStep === 2 && !directJoin
    ? `Hello ${form.name?.trim() || "there"}`
    : "Join the queue";

  useEffect(() => {
    if (issueStep === 1) {
      nameInputRef.current?.focus();
    }
  }, [issueStep]);

  useEffect(() => {
    if (directJoin && issueStep !== 1) {
      setIssueStep?.(1);
    }
  }, [directJoin, issueStep, setIssueStep]);

  useEffect(() => {
    if (issueStep !== 2 || directJoin || typeof window === "undefined") return undefined;

    const handlePopState = () => {
      setIssueStep?.(1);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [directJoin, issueStep, setIssueStep]);

  const goToServiceStep = () => {
    const advanced = advanceIssueStep?.();
    if (!advanced || typeof window === "undefined") return;
    if (window.history.state?.waitqrIssueStep === 2) return;
    window.history.pushState({ ...(window.history.state || {}), waitqrIssueStep: 2 }, "", window.location.href);
  };

  const returnToDetailsStep = () => {
    if (typeof window !== "undefined" && window.history.state?.waitqrIssueStep === 2) {
      window.history.back();
      return;
    }
    setIssueStep?.(1);
  };

  const joinActions = (
    <div className="qp-kiosk-join-actions grid grid-cols-1 gap-3">
      <button
        type="button"
        onClick={() => {
          if (formError) setFormError?.("");
          onIssue(directJoin ? defaultServiceId : undefined);
        }}
        disabled={issuePending}
        className="qp-focusable inline-flex min-h-[51px] items-center justify-center gap-2 px-4 text-sm font-semibold transition-opacity"
        style={{ background: appearance.fontColor, color: appearance.bgColor, borderRadius: appearance.radius, opacity: issuePending ? 0.6 : 1 }}
      >
        {issuePending ? "Saving..." : "Join queue"}
        <ArrowRight size={15} className={form.serviceId ? "qp-join-arrow-elastic" : ""} />
      </button>
    </div>
  );

  return (
    <div
      className={`qp-kiosk-form w-full overflow-hidden p-3 sm:p-5 ${serviceStepActive ? "qp-kiosk-form-step2" : ""}`}
      style={{
        background: panelBackground,
        color: appearance.fontColor,
        border: `1px solid ${appearance.borderColor}`,
        borderRadius: appearance.radius,
      }}
    >
      <div className="qp-kiosk-form-header mb-4 min-w-0">
        <div className="min-w-0">
          <button
            type="button"
            onClick={issueStep === 2 && !directJoin ? returnToDetailsStep : undefined}
            className="flex w-full min-w-0 items-center text-left text-xl font-semibold leading-tight"
            style={{ color: appearance.accentColor, cursor: issueStep === 2 && !directJoin ? "pointer" : "default" }}
            aria-label={issueStep === 2 && !directJoin ? "Back to details" : undefined}
          >
            <span className="min-w-0 flex-1 truncate">{stepTitle}</span>
          </button>
          {issueStep === 2 && showServiceSelection ? (
            <div className="mt-1 text-[10px] uppercase tracking-[0.16em]" style={{ color: serviceInvalid ? C.coral : mutedText, opacity: serviceInvalid ? 1 : 0.5 }}>
              Select a {serviceWord}
            </div>
          ) : null}
        </div>
      </div>

      <div className="qp-kiosk-form-body flex flex-col gap-4">
        {issueStep === 1 && (
          <>
            <div className="grid gap-3">
              <div>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }));
                    if (nameInvalid) setFormErrors?.((errors) => ({ ...errors, name: false }));
                    if (formError) setFormError?.("");
                  }}
                  placeholder="Name"
                  className="w-full px-4 py-3.5 text-[15px] font-medium outline-none transition-colors"
                  style={fieldStyle}
                  aria-invalid={nameInvalid}
                  {...focusHandlers}
                />
                {nameInvalid ? (
                  <div className="mt-1.5 text-xs font-medium leading-snug" style={{ color: C.coral }}>
                    Name is required.
                  </div>
                ) : null}
              </div>
              <div>
                <input
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, phone: e.target.value }));
                    if (phoneInvalid) setFormErrors?.((errors) => ({ ...errors, phone: false }));
                    if (formError) setFormError?.("");
                  }}
                  placeholder="Phone"
                  className="w-full px-4 py-3.5 text-[15px] font-medium outline-none transition-colors"
                  style={fieldStyle}
                  aria-invalid={phoneInvalid}
                  {...focusHandlers}
                />
                {phoneErrorText ? (
                  <div className="mt-1.5 text-xs font-medium leading-snug" style={{ color: C.coral }}>
                    {phoneErrorText}
                  </div>
                ) : null}
              </div>
            </div>

            {directJoin ? (
              joinActions
            ) : (
              <button
                type="button"
                onClick={goToServiceStep}
                disabled={issuePending}
                className="qp-focusable flex min-h-[51px] items-center justify-center gap-2 px-3 text-sm font-semibold transition-opacity"
                style={{ background: appearance.accentColor, color: appearance.bgColor, borderRadius: appearance.radius, opacity: issuePending ? 0.6 : 1 }}
              >
                Continue
                <ArrowRight size={15} />
              </button>
            )}

            {formError && (
              <div className="text-xs font-medium leading-snug" style={{ color: C.coral }}>
                {formError}
              </div>
            )}
          </>
        )}

        {issueStep === 2 && (
          <>
            {showServiceSelection ? (
              <div className="qp-kiosk-service-scroll">
                <div className="grid gap-2">
                  {availableServices.map((s) => {
                    const selected = form.serviceId === s.id;
                    const priceLabel = servicePriceLabel(s, appearance.currency);
                    const hasImage = Boolean(s.image);
                    const description = String(s.description || "").trim();
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, serviceId: s.id }));
                          if (serviceInvalid) setFormErrors?.((errors) => ({ ...errors, service: false }));
                          if (formError) setFormError?.("");
                        }}
                        className="qp-focusable flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors"
                        style={{
                          background: selected
                            ? withAlpha(appearance.accentColor, "29")
                            : "rgba(255,255,255,0.18)",
                          color: appearance.fontColor,
                          borderRadius: appearance.radius,
                          boxShadow: selected ? "none" : "0 4px 14px rgba(15,23,42,0.05)",
                        }}
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          {hasImage ? (
                            <span
                              className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border"
                              style={{
                                borderColor: selected ? appearance.accentColor : appearance.borderColor,
                                borderRadius: appearance.radius,
                              }}
                              aria-hidden="true"
                            >
                              <img src={s.image} alt="" className="h-full w-full object-cover" />
                              {selected ? (
                                <span className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: withAlpha(appearance.accentColor, "99"), color: appearance.bgColor }}>
                                  <Check size={16} strokeWidth={3} />
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span
                              className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center border"
                              style={{
                                borderColor: appearance.accentColor,
                                backgroundColor: selected ? appearance.accentColor : "transparent",
                                borderRadius: appearance.radius,
                                color: appearance.bgColor,
                              }}
                              aria-hidden="true"
                            >
                              {selected ? <Check size={12} strokeWidth={3} /> : null}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-semibold">{s.name}</div>
                              {priceLabel ? (
                                <div className="qp-mono shrink-0 text-sm font-semibold" style={{ color: selected ? appearance.accentColor : mutedText }}>
                                  {priceLabel}
                                </div>
                              ) : null}
                            </div>
                            {description ? (
                              <div
                                className="mt-0.5 overflow-hidden text-xs leading-snug"
                                style={{
                                  color: mutedText,
                                  display: "-webkit-box",
                                  WebkitBoxOrient: "vertical",
                                  WebkitLineClamp: 2,
                                }}
                              >
                                {description}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {joinActions}

            {formError && (
              <div className="text-xs font-medium leading-snug" style={{ color: C.coral }}>
                {formError}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
