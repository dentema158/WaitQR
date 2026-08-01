import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ChevronUp,
  LogOut,
  MapPin,
  Smile,
  Star,
  Ticket,
  Undo2,
  X,
} from "lucide-react";
import { C, pageBackground } from "../../lib/theme";
import { countdownLabel, elapsedLabel, elapsedTimerLabel, finishTimeLabel, waitEstimateDisplay } from "../../lib/format";
import { cancelSubmissionRecall, deleteSubmissionByPublicToken, getSubmissionByAccessKey, rateSubmissionByPublicToken, requestSubmissionRecall } from "../../lib/submissionsApi";
import { PageFooter } from "../layout/PageFooter";
import { ConfirmDialog } from "../modals/ConfirmDialog";

const ticketPageStyle = {
  width: "min(100%, 520px)",
};

const RATING_OPTIONS = [
  { value: 1, label: "Poor", color: C.coral },
  { value: 2, label: "Fair", color: C.coral },
  { value: 3, label: "Good", color: C.amber },
  { value: 4, label: "Very good", color: C.teal },
  { value: 5, label: "Excellent", color: C.teal },
];

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

function initials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

function withAlpha(color, opacity) {
  const hex = String(color || "").replace("#", "");
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
    return `#${hex}${alpha}`;
  }
  return `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`;
}

function formatWaitEstimate(estimate, now, status) {
  if (status === "completed") return "Completed";
  if (status === "skipped" || status === "absent") return "You were missed";
  if (status === "removed") return "Ticket removed";
  if (!estimate) return "Calculating";
  if (estimate.status === "serving") return "Now serving";

  const display = waitEstimateDisplay(estimate, now);
  return display.waitMs == null ? "Calculating" : countdownLabel(display.waitMs);
}

function isReadyForCall(ticketPosition, waitEstimate, now, status) {
  if (status !== "queued" && status !== "called") return false;
  if (Number(ticketPosition) !== 1 || !waitEstimate) return false;
  const display = waitEstimateDisplay(waitEstimate, now);
  return !display.paused && !display.delayed && display.waitMs === 0;
}

function ordinal(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  const whole = Math.trunc(number);
  if (whole <= 0) return "";
  const mod100 = whole % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${whole}th`;
  const mod10 = whole % 10;
  if (mod10 === 1) return `${whole}st`;
  if (mod10 === 2) return `${whole}nd`;
  if (mod10 === 3) return `${whole}rd`;
  return `${whole}th`;
}

function queueFallbackLabel(waitEstimate, status) {
  if (status === "completed") return "Completed";
  if (status === "skipped" || status === "absent") return "You were missed";
  if (status === "removed") return "Ticket removed";
  if (status === "called") return "You're called";
  if (waitEstimate?.status === "serving" || status === "serving") return "Now serving";
  return "Queue position loading";
}

function ticketThemeColor(status, accentColor) {
  if (status === "called") return C.amber;
  if (status === "serving" || status === "completed") return C.teal;
  if (status === "skipped" || status === "absent" || status === "removed") return C.coral;
  return accentColor;
}

function SubmissionCard({
  submission,
  serviceName,
  services = [],
  submissions = [],
  ticketPosition,
  ticketDeskName,
  waitEstimate,
  now,
  theme,
  members,
  onRequestRecall,
  onCancelRecall,
  onRate,
  onExit,
  exitPending,
  recallRequesting,
  recallCancelling,
  recallError,
  ratingPending,
  ratingError,
}) {
  const [serviceExpanded, setServiceExpanded] = useState(false);

  useEffect(() => {
    const expandTimer = window.setTimeout(() => setServiceExpanded(true), 2000);
    const collapseTimer = window.setTimeout(() => setServiceExpanded(false), 7000);
    return () => {
      window.clearTimeout(expandTimer);
      window.clearTimeout(collapseTimer);
    };
  }, []);
  const appearance = {
    accentColor: theme?.accentColor || C.amber,
    bgColor: theme?.bgColor || C.ink900,
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.ink600,
    radius: Number(theme?.radius) || 8,
    currency: theme?.currency || "USD",
  };

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    let themeMeta = document.querySelector('meta[name="theme-color"]');
    const createdMeta = !themeMeta;
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.setAttribute("name", "theme-color");
      document.head.appendChild(themeMeta);
    }

    const previousColor = themeMeta.getAttribute("content");
    themeMeta.setAttribute("content", ticketThemeColor(submission.status, appearance.accentColor));

    return () => {
      if (createdMeta) {
        themeMeta.remove();
      } else if (previousColor == null) {
        themeMeta.removeAttribute("content");
      } else {
        themeMeta.setAttribute("content", previousColor);
      }
    };
  }, [appearance.accentColor, submission.status]);

  const serviceLine = submission.serviceId ? serviceName(submission.serviceId) : "General";
  const selectedService = (services || []).find((service) => String(service.id) === String(submission.serviceId));
  const priceLabel = servicePriceLabel(selectedService, appearance.currency);
  const serviceDescription = String(selectedService?.description || "").trim();
  const isQueued = submission.status === "queued";
  const isCalled = submission.status === "called";
  const isServing = submission.status === "serving";
  const isCompleted = submission.status === "completed";
  const isAbsent = submission.status === "skipped" || submission.status === "absent";
  const isRemoved = submission.status === "removed";
  const counterLabel = isRemoved
    ? "Ticket cancelled"
    : isAbsent
      ? "Marked absent"
      : isCalled
        ? "Please proceed to"
        : isServing
          ? "Serving at"
          : "Proceed to";
  const normalizedServedByName = String(submission.servedByMemberName || "").trim().toLocaleLowerCase();
  const servedByMember = (members || []).find((member) => (
    String(member.id) === String(submission.servedByMemberId)
    || (normalizedServedByName && String(member.name || "").trim().toLocaleLowerCase() === normalizedServedByName)
  ));
  const assignedMember = servedByMember || (members || []).find((member) => (
    Array.isArray(member.deskIds) && member.deskIds.some((deskId) => String(deskId) === String(submission.deskId))
  ));
  const servedByName = assignedMember?.name || submission.servedByMemberName || "Team member";
  const memberRatings = (submissions || [])
    .filter((item) => (
      (assignedMember?.id && String(item.servedByMemberId) === String(assignedMember.id))
      || (servedByName && String(item.servedByMemberName || "").trim().toLowerCase() === String(servedByName).trim().toLowerCase())
    ))
    .map((item) => Number(item.feedbackRating))
    .filter((rating) => rating >= 1 && rating <= 5);
  const memberRating = memberRatings.length
    ? memberRatings.reduce((sum, rating) => sum + rating, 0) / memberRatings.length
    : Number(assignedMember?.averageRating ?? assignedMember?.rating);
  const ratingScore = Number(submission.feedbackRating) || 0;
  const selectedRating = RATING_OPTIONS.find((option) => option.value === ratingScore);
  const isNoLongerWaiting = isAbsent || isRemoved;
  const recallRequested = Boolean(submission.recallRequestedAt);
  const absentCalledAt = submission.skippedAt || submission.statusUpdatedAt || submission.calledAt;
  const absentCalledLabel = absentCalledAt
    ? `You were called ${elapsedLabel(now - absentCalledAt)} ago.`
    : "You were called.";
  const livePosition = Number(ticketPosition);
  const initialPosition = Number(submission.joinedPosition);
  const effectivePosition = Number.isFinite(livePosition) && livePosition > 0
    ? livePosition
    : isQueued && Number.isFinite(initialPosition) && initialPosition > 0
      ? initialPosition
      : null;
  const positionLabel = ordinal(effectivePosition);
  const hasQueuePosition = isQueued && Boolean(positionLabel);
  const estimateDisplay = waitEstimateDisplay(waitEstimate, now);
  const waitLabel = isReadyForCall(effectivePosition, waitEstimate, now, submission.status)
    ? "Wait for the call"
    : formatWaitEstimate(waitEstimate, now, submission.status);
  const showWaitBlock = isQueued
    && (hasQueuePosition || waitLabel !== queueFallbackLabel(waitEstimate, submission.status));
  const showWaitHeading = waitLabel !== "Wait for the call";
  const waitHeading = estimateDisplay.paused
    ? "Counter on break"
    : estimateDisplay.delayed
      ? "Slight delay"
      : "Estimated wait";
  const position = Number(effectivePosition);
  const joinedPosition = Math.max(1, Number(submission.joinedPosition) || position || 1);
  const totalPositionSteps = Math.max(0, joinedPosition - 1);
  const isFinalRingState = isCalled || isServing || isCompleted || isNoLongerWaiting;
  const progressTicketId = String(submission.id);
  const currentRingPosition = Math.max(1, position || joinedPosition);
  const initialStepStartedAt = currentRingPosition === joinedPosition
    ? Number(submission.createdAt) || now
    : now;
  const progressRef = useRef({
    ticketId: progressTicketId,
    bestPosition: currentRingPosition,
    stepStartedAt: initialStepStartedAt,
    value: 0.08,
  });

  if (progressRef.current.ticketId !== progressTicketId) {
    progressRef.current = {
      ticketId: progressTicketId,
      bestPosition: currentRingPosition,
      stepStartedAt: initialStepStartedAt,
      value: 0.08,
    };
  } else if (currentRingPosition < progressRef.current.bestPosition) {
    progressRef.current.bestPosition = currentRingPosition;
    progressRef.current.stepStartedAt = now;
  }

  const bestPosition = progressRef.current.bestPosition;
  const completedPositionSteps = Math.max(0, joinedPosition - bestPosition);
  const confirmedPositionProgress = bestPosition <= 1
    ? 0.9
    : totalPositionSteps > 0
      ? 0.08 + (0.82 * completedPositionSteps) / totalPositionSteps
      : 0.08;
  const positionSegmentSize = totalPositionSteps > 0 ? 0.82 / totalPositionSteps : 0;
  const estimatedStepMs = Math.max(
    30_000,
    Number(waitEstimate?.estimatedServiceMs)
      || Number(waitEstimate?.positionStepEndsAt) - Number(waitEstimate?.positionStepStartedAt)
      || 60_000,
  );
  const effectiveProgressNow = estimateDisplay.paused
    ? Math.min(now, Number(waitEstimate?.pauseStartedAt) || now)
    : now;
  const elapsedStepMs = Math.max(0, effectiveProgressNow - progressRef.current.stepStartedAt);
  const timedSegmentProgress = bestPosition > 1
    ? Math.min(0.94, elapsedStepMs / estimatedStepMs)
    : 0;
  const firstPositionProgress = bestPosition <= 1
    ? Math.min(0.94, elapsedStepMs / estimatedStepMs)
    : 0;
  const calculatedProgress = isFinalRingState
    ? 1
    : bestPosition <= 1
      ? confirmedPositionProgress + 0.1 * firstPositionProgress
      : confirmedPositionProgress + positionSegmentSize * timedSegmentProgress;
  progressRef.current.value = Math.max(
    progressRef.current.value,
    Math.max(0.08, Math.min(isFinalRingState ? 1 : 0.994, calculatedProgress)),
  );
  const progress = progressRef.current.value;
  const ringLength = 289;
  const progressDash = Math.round(ringLength * progress * 1000) / 1000;
  const statusAccent = isNoLongerWaiting
    ? C.coral
    : isServing || isCompleted
      ? C.teal
      : isCalled
        ? C.amber
        : appearance.accentColor;
  const serviceTimer = isServing && submission.startedAt
    ? elapsedTimerLabel(now - submission.startedAt)
    : isCompleted
      ? finishTimeLabel(submission.completedAt || submission.statusUpdatedAt, now)
      : "";
  const panelStyle = {
    color: appearance.fontColor,
    backgroundColor: withAlpha(appearance.fontColor, 0.035),
    borderColor: appearance.borderColor,
    borderRadius: appearance.radius,
  };
  const detailsText = appearance.bgColor;
  const detailsMuted = withAlpha(appearance.bgColor, 0.62);
  const detailsFaint = withAlpha(appearance.bgColor, 0.45);
  const detailsLine = withAlpha(appearance.bgColor, 0.14);
  const detailsPanelStyle = {
    color: detailsText,
    backgroundColor: appearance.fontColor,
    borderColor: detailsLine,
    borderRadius: appearance.radius,
  };
  return (
    <div className="mx-auto flex w-full flex-col gap-4" style={ticketPageStyle}>
      <section
        className="qp-ticket-ring-host relative mx-auto flex aspect-square w-full max-w-[440px] items-center justify-center"
        aria-label="Current queue status"
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 108 108" aria-hidden="true">
          <circle
            cx="54"
            cy="54"
            r="46"
            fill="none"
            stroke={appearance.borderColor}
            strokeWidth="3.2"
          />
          <circle
            data-testid="queue-position-progress"
            cx="54"
            cy="54"
            r="46"
            fill="none"
            stroke={statusAccent}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeDasharray={`${progressDash} ${ringLength}`}
            transform="rotate(-90 54 54)"
            style={{ transition: "stroke-dasharray 600ms ease" }}
          />
        </svg>

        <div className="relative z-[1] flex h-[82%] w-[78%] flex-col items-center justify-center px-4 text-center">
          {!isCompleted ? (
            <>
              <div
                className="inline-flex rounded px-2 py-1 text-base font-semibold uppercase leading-none"
                style={{
                  color: statusAccent,
                  backgroundColor: isNoLongerWaiting
                    ? C.coralSoft
                    : isServing
                      ? C.tealSoft
                      : isCalled
                        ? C.amberSoft
                        : withAlpha(appearance.fontColor, 0.035),
                }}
              >
                {submission.label}
              </div>
              <div className="mt-2 text-[10px] font-semibold uppercase" style={{ color: withAlpha(appearance.fontColor, 0.6) }}>
                Your ticket
              </div>
            </>
          ) : null}

          <div className={`${isCompleted ? "" : "mt-4"} flex flex-col items-center justify-center`}>
            {isCalled ? (
              <>
                <div className="text-3xl font-semibold leading-tight sm:text-4xl" style={{ color: C.amber }}>
                  You're called
                </div>
                <div className="mt-3 text-[10px] font-semibold uppercase" style={{ color: withAlpha(appearance.fontColor, 0.6) }}>
                  Please proceed to
                </div>
                <div className="mt-1 text-xl font-semibold sm:text-2xl" style={{ color: appearance.fontColor }}>
                  {ticketDeskName || "the counter"}
                </div>
              </>
            ) : isServing ? (
              <>
                <div className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl" style={{ color: C.teal }}>
                  Now serving
                </div>
                <div className="mt-3 text-[10px] font-semibold uppercase" style={{ color: withAlpha(appearance.fontColor, 0.6) }}>
                  At
                </div>
                <div className="mt-1 text-xl font-semibold sm:text-2xl" style={{ color: appearance.fontColor }}>
                  {ticketDeskName || "the counter"}
                </div>
              </>
            ) : isCompleted ? (
              <>
                <div
                  data-testid="completed-check"
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-full sm:h-11 sm:w-11"
                  style={{
                    color: C.teal,
                    backgroundColor: C.tealSoft,
                  }}
                  aria-hidden="true"
                >
                  <Check size={23} strokeWidth={3} />
                </div>
                <div
                  className="inline-flex rounded px-2 py-1 text-base font-semibold uppercase leading-none"
                  style={{
                    color: C.teal,
                    backgroundColor: C.tealSoft,
                  }}
                >
                  {submission.label}
                </div>
                <div className="mt-2 text-[10px] font-semibold uppercase" style={{ color: withAlpha(appearance.fontColor, 0.6) }}>
                  Your ticket
                </div>
                <div className="text-3xl font-semibold leading-tight sm:text-4xl" style={{ color: C.teal }}>
                  Completed
                </div>
                <div className="mt-2 text-[10px] font-semibold uppercase" style={{ color: C.teal }}>
                  Service finished
                </div>
              </>
            ) : isNoLongerWaiting ? (
              <>
                <div className="text-3xl font-semibold leading-tight sm:text-4xl" style={{ color: C.coral }}>
                  {isAbsent ? "You were missed" : "Ticket removed"}
                </div>
                <div className="mt-2 max-w-52 text-center text-xs leading-snug" style={{ color: withAlpha(appearance.fontColor, 0.68) }}>
                  {isAbsent ? absentCalledLabel : "No longer in queue"}
                </div>
              </>
            ) : hasQueuePosition ? (
              <>
                <div className="text-[4.75rem] font-semibold leading-none sm:text-[6rem]" style={{ color: appearance.accentColor }}>
                  {positionLabel}
                </div>
                <div className="mt-2 text-[11px] font-semibold uppercase" style={{ color: withAlpha(appearance.fontColor, 0.68) }}>
                  In the queue
                </div>
              </>
            ) : (
              <div className="max-w-full text-2xl font-semibold leading-tight sm:text-3xl" style={{ color: appearance.accentColor }}>
                {queueFallbackLabel(waitEstimate, submission.status)}
              </div>
            )}
          </div>

          {showWaitBlock ? (
            <div className="mt-4 w-full">
              <div className="mx-auto mb-3 w-2/3 border-t" style={{ borderColor: withAlpha(appearance.fontColor, 0.12) }} />
              <div className="min-h-[48px] text-center">
                {showWaitHeading ? (
                  <div className="text-[10px] font-semibold uppercase" style={{ color: withAlpha(appearance.fontColor, 0.62) }}>
                    {waitHeading}
                  </div>
                ) : null}
                <div className="mt-0.5 text-xl font-semibold leading-none sm:text-2xl" style={{ color: appearance.fontColor }}>
                  {waitLabel}
                </div>
              </div>
            </div>
          ) : null}
        </div>

      </section>

      <section
        className="overflow-hidden"
        style={{ ...detailsPanelStyle, cursor: isCompleted ? "default" : "pointer" }}
        aria-label="Ticket details"
        onClick={isCompleted ? undefined : () => setServiceExpanded((expanded) => !expanded)}
      >
        {isCompleted ? (
          <>
            <div className="grid gap-y-3 px-4 py-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 text-left">
                <div className="min-w-0">
                  <div data-testid="ticket-service-value" className="truncate text-base font-semibold" style={{ color: C.teal }}>{serviceLine}</div>
                  <div data-testid="ticket-counter-value" className="mt-0.5 truncate text-xs font-normal" style={{ color: detailsMuted }}>
                    {ticketDeskName || "Counter"}
                  </div>
                </div>
                {priceLabel ? (
                  <div className="qp-mono shrink-0 text-right text-base font-semibold" style={{ color: detailsText }}>
                    {priceLabel}
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5 border-t pt-3" style={{ borderColor: detailsLine }}>
                {servedByMember?.photo ? <img src={servedByMember.photo} alt={servedByName} className="h-10 w-10 shrink-0 rounded-full border object-cover" style={{ borderColor: detailsLine }} /> : null}
                <div className="col-span-2 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[10px] font-normal uppercase" style={{ color: detailsMuted }}>Served by</div>
                    {serviceTimer ? (
                      <span className="qp-mono shrink-0 whitespace-nowrap text-[10px]" style={{ color: detailsMuted }}>{serviceTimer}</span>
                    ) : null}
                  </div>
                  <div className="truncate text-sm font-semibold" style={{ color: detailsText }}>
                    {servedByName}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-4 pb-4 pt-1 text-center">
              <div className="w-full rounded-md px-3 py-3" style={{ backgroundColor: withAlpha(C.teal, 0.1) }}>
                <div className="flex items-center justify-start gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: withAlpha(C.teal, 0.16), color: C.teal }}>
                    <Smile size={17} />
                  </span>
                  <div className="text-left text-sm font-semibold leading-snug" style={{ color: detailsText }}>How was your experience?</div>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 sm:gap-3" role="group" aria-label="Rate your experience">
                  {RATING_OPTIONS.map((option) => {
                    const selected = ratingScore === option.value;
                    const filled = option.value <= ratingScore;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onRate(option.value)}
                        disabled={ratingPending || !submission.publicToken}
                        aria-label={`${option.value} stars, ${option.label}`}
                        aria-pressed={selected}
                        className="qp-focusable flex h-9 w-9 items-center justify-center transition-transform duration-200 ease-out hover:scale-105 disabled:cursor-wait"
                        style={{
                          color: filled ? selectedRating?.color : detailsFaint,
                          transform: selected ? "scale(1.08)" : "scale(1)",
                          transition: "color 180ms ease, transform 180ms ease",
                        }}
                      >
                        <Star
                          size={25}
                          fill={filled ? "currentColor" : "none"}
                          style={{ transition: "fill 180ms ease, stroke 180ms ease" }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-1 min-h-[16px] text-xs font-semibold transition-colors duration-200" style={{ color: selectedRating?.color || "transparent" }}>
                {selectedRating?.label || ""}
              </div>
              {ratingError ? <p className="mt-2 text-xs" style={{ color: C.coral }}>{ratingError}</p> : null}
            </div>
          </>
        ) : (
          <>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
            style={{ color: statusAccent, borderColor: detailsLine }}
          >
            <MapPin size={19} />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase" style={{ color: detailsMuted }}>
              {counterLabel}
            </div>
            <div
              data-testid="ticket-counter-value"
              className="mt-0.5 truncate text-base font-semibold"
              style={{ color: statusAccent }}
            >
              {ticketDeskName || "Assigning counter"}
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {serviceTimer ? (
              <span className="qp-mono inline-flex items-center text-xs font-semibold" style={{ color: statusAccent }}>
                {serviceTimer}
              </span>
            ) : null}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setServiceExpanded((expanded) => !expanded);
              }}
              aria-expanded={serviceExpanded}
              aria-controls="ticket-service-details"
              aria-label={serviceExpanded ? "Hide service details" : "Show service details"}
              className="qp-focusable inline-flex h-8 w-8 items-center justify-center"
              style={{ color: statusAccent }}
            >
              {serviceExpanded ? <ChevronUp size={19} aria-hidden="true" /> : <ChevronRight size={19} aria-hidden="true" />}
            </button>
          </div>
        </div>
        <div
          id="ticket-service-details"
          aria-hidden={!serviceExpanded}
          className="overflow-hidden transition-[max-height,opacity,transform] duration-500 ease-out"
          style={{
            maxHeight: serviceExpanded ? 220 : 0,
            opacity: serviceExpanded ? 1 : 0,
            transform: serviceExpanded ? "translateY(0)" : "translateY(-6px)",
          }}
        >
          <div className="flex flex-wrap items-start gap-2.5 border-t px-4 py-3.5" style={{ borderColor: detailsLine }}>
                {assignedMember?.photo ? <img src={assignedMember.photo} alt={servedByName} className="h-10 w-10 shrink-0 rounded-full border object-cover" style={{ borderColor: detailsLine }} /> : null}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <div className="truncate text-sm font-semibold" style={{ color: detailsText }}>{servedByName}</div>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: Number.isFinite(memberRating) ? C.amber : detailsFaint }}>
                <span className="flex items-center" aria-label={Number.isFinite(memberRating) ? `${memberRating.toFixed(1)} out of 5` : "No ratings yet"}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={13} fill={Number.isFinite(memberRating) && star <= Math.round(memberRating) ? "currentColor" : "none"} aria-hidden="true" />
                  ))}
                </span>
                {Number.isFinite(memberRating) ? (
                  <>
                    <span>{memberRating.toFixed(1)}</span>
                    <span style={{ color: detailsMuted }}>({memberRatings.length} {memberRatings.length === 1 ? "review" : "reviews"})</span>
                  </>
                ) : null}
              </div>
              </div>
            {isAbsent ? (
                <div className="ml-auto max-w-[42%] shrink-0">
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); (recallRequested ? onCancelRecall : onRequestRecall)(); }}
                    disabled={recallRequesting || recallCancelling}
                    className="qp-focusable inline-flex h-8 max-w-full items-center justify-center gap-1 whitespace-nowrap px-2.5 text-[11px] font-semibold disabled:cursor-default"
                    style={{
                      color: recallRequested ? C.coral : C.teal,
                      backgroundColor: recallRequested ? C.coralSoft : C.tealSoft,
                      borderRadius: Math.min(appearance.radius, 6),
                    }}
                  >
                    {recallRequested ? <X size={13} aria-hidden="true" /> : <Undo2 size={13} aria-hidden="true" />}
                    <span>{recallRequested ? (recallCancelling ? "Cancelling..." : "Cancel recall") : recallRequesting ? "Requesting..." : "Recall me"}</span>
                  </button>
                  {recallError ? <p className="mt-1 text-[10px]" style={{ color: C.coral }}>{recallError}</p> : null}
                </div>
            ) : null}
            {assignedMember?.about ? (
              <div
                className="basis-full overflow-hidden text-[10px] leading-snug"
                style={{
                  color: detailsMuted,
                  display: "-webkit-box",
                  textOverflow: "ellipsis",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                }}
              >
                {assignedMember.about}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            {selectedService?.image ? (
              <img
                src={selectedService.image}
                alt=""
                className="h-10 w-10 shrink-0 rounded-md object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <div data-testid="ticket-service-value" className="min-w-0 truncate text-base font-semibold" style={{ color: detailsText }}>
                  {serviceLine}
                </div>
                {priceLabel ? <div className="qp-mono shrink-0 text-base font-semibold" style={{ color: C.teal }}>{priceLabel}</div> : null}
              </div>
              {serviceDescription ? (
                <div className="mt-0.5 overflow-hidden text-[10px] text-ellipsis whitespace-nowrap" style={{ color: detailsMuted }}>
                  {serviceDescription}
                </div>
              ) : null}
            </div>
          </div>
        </div>
          </>
        )}
      </section>

      {submission.publicToken && (isQueued || isCalled) ? (
        <button
          type="button"
          onClick={onExit}
          disabled={exitPending}
          title="Leave ticket"
          className="qp-focusable inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 text-sm font-semibold disabled:cursor-wait disabled:opacity-50"
          style={{ color: C.coral, backgroundColor: C.coralSoft, borderRadius: Math.min(appearance.radius, 6) }}
        >
          <LogOut size={16} aria-hidden="true" />
          <span>{exitPending ? "Leaving..." : "Leave"}</span>
        </button>
      ) : null}

    </div>
  );
}

export function TicketPage({
  ticketLabel,
  ticket,
  ticketsLoaded,
  ticketPosition,
  ticketDeskName,
  waitEstimate,
  now = Date.now(),
  serviceName,
  services = [],
  members = [],
  submissions = [],
  theme,
  onNavigate,
}) {
  const [submission, setSubmission] = useState(ticket || null);
  const [loading, setLoading] = useState(!ticket);
  const [error, setError] = useState("");
  const [recallRequesting, setRecallRequesting] = useState(false);
  const [recallCancelling, setRecallCancelling] = useState(false);
  const [recallError, setRecallError] = useState("");
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [exitPending, setExitPending] = useState(false);
  const [exitError, setExitError] = useState("");
  const [exited, setExited] = useState(false);
  const [ratingPending, setRatingPending] = useState(false);
  const [ratingError, setRatingError] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!ticketLabel) {
      setLoading(false);
      setSubmission(null);
      setError("Ticket not found.");
      return;
    }

    if (ticket && (
      String(ticket.label).toUpperCase() === String(ticketLabel).toUpperCase()
      || String(ticket.publicToken || "") === String(ticketLabel)
    )) {
      setSubmission(ticket);
      setLoading(false);
      setError("");
      return;
    }

    if (!ticketsLoaded) {
      setLoading(true);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    getSubmissionByAccessKey(ticketLabel)
      .then((nextSubmission) => {
        if (cancelled) return;
        setSubmission(nextSubmission);
        setError(nextSubmission ? "" : "Ticket not found.");
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(fetchError.message || "Failed to load ticket.");
        setSubmission(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticket, ticketLabel, ticketsLoaded]);

  const handleRecallRequest = async () => {
    if (!submission?.id || recallRequesting || submission.recallRequestedAt) return;
    setRecallRequesting(true);
    setRecallError("");

    try {
      const updatedSubmission = await requestSubmissionRecall(submission.id);
      if (updatedSubmission) setSubmission(updatedSubmission);
    } catch (requestError) {
      setRecallError(requestError.message || "Could not request a recall.");
    } finally {
      setRecallRequesting(false);
    }
  };

  const handleRecallCancel = async () => {
    if (!submission?.id || recallRequesting || !submission.recallRequestedAt) return;
    setRecallCancelling(true);
    setRecallError("");

    try {
      const updatedSubmission = await cancelSubmissionRecall(submission.id);
      if (updatedSubmission) setSubmission(updatedSubmission);
    } catch (requestError) {
      setRecallError(requestError.message || "Could not cancel the recall.");
    } finally {
      setRecallCancelling(false);
    }
  };

  const handleExit = async () => {
    if (!submission?.publicToken || exitPending) return;
    setExitPending(true);
    setExitError("");

    try {
      await deleteSubmissionByPublicToken(submission.publicToken);
      setExitConfirmOpen(false);
      setSubmission(null);
      setExited(true);
    } catch (deleteError) {
      setExitError(deleteError.message || "Could not delete ticket.");
      setExitConfirmOpen(false);
    } finally {
      setExitPending(false);
    }
  };

  const handleRate = async (rating) => {
    if (!submission?.publicToken || submission.status !== "completed" || ratingPending) return;
    setRatingPending(true);
    setRatingError("");
    try {
      const updatedSubmission = await rateSubmissionByPublicToken(submission.publicToken, rating);
      if (updatedSubmission) setSubmission(updatedSubmission);
    } catch (ratingRequestError) {
      setRatingError(ratingRequestError.message || "Could not save your rating.");
    } finally {
      setRatingPending(false);
    }
  };

  const appearance = {
    accentColor: theme?.accentColor || C.amber,
    bgColor: theme?.bgColor || C.ink900,
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.ink600,
    radius: Number(theme?.radius) || 8,
    themeColors: theme?.themeColors,
  };
  const lightThemeBorderColor = appearance.themeColors?.Light?.borderColor || appearance.borderColor;

  return (
    <main
      className="qp-page-shell qp-kiosk-page-shell qp-ticket-page-shell py-6 sm:py-8"
      style={{ backgroundColor: pageBackground(appearance), color: appearance.fontColor }}
    >
      <section className="qp-kiosk-panel qp-ticket-page-content" style={ticketPageStyle}>
        {exited ? (
          <div
            className="mx-auto flex min-h-72 w-full flex-col items-center justify-center px-8 py-10 text-center"
            style={{ color: appearance.fontColor }}
          >
            <div className="text-2xl font-semibold" style={{ color: C.coral }}>Ticket deleted</div>
            <p className="mt-2 text-sm" style={{ color: C.textMuted }}>You have exited the queue.</p>
            <button
              type="button"
              onClick={() => onNavigate?.("/create")}
              className="qp-focusable mt-5 px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: appearance.accentColor, borderRadius: appearance.radius }}
            >
              Return
            </button>
          </div>
        ) : loading ? (
          <div
            className="mx-auto flex min-h-72 items-center justify-center border px-8 py-10 text-center"
            style={{
              color: withAlpha(appearance.fontColor, 0.62),
              borderColor: appearance.borderColor,
              borderRadius: appearance.radius,
              backgroundColor: withAlpha(appearance.fontColor, 0.035),
            }}
          >
            <div className="flex items-center gap-3 text-sm sm:text-base">
              <Ticket size={18} />
              Loading ticket...
            </div>
          </div>
        ) : submission ? (
          <SubmissionCard
            submission={submission}
            serviceName={serviceName}
            services={services}
            ticketPosition={ticketPosition}
            ticketDeskName={ticketDeskName}
            waitEstimate={waitEstimate}
            now={now}
            theme={appearance}
            members={members}
            submissions={submissions}
            onRequestRecall={handleRecallRequest}
            onCancelRecall={handleRecallCancel}
            onRate={handleRate}
            onExit={() => setExitConfirmOpen(true)}
            exitPending={exitPending}
            recallRequesting={recallRequesting}
            recallCancelling={recallCancelling}
            recallError={recallError}
            ratingPending={ratingPending}
            ratingError={ratingError}
          />
        ) : (
          <button
            type="button"
            onClick={() => onNavigate?.("/")}
            className="mx-auto flex min-h-72 w-full items-center justify-center gap-3 border px-8 py-10 text-center"
            style={{
              color: appearance.fontColor,
              borderColor: appearance.borderColor,
              borderRadius: appearance.radius,
              backgroundColor: withAlpha(appearance.fontColor, 0.035),
            }}
          >
            <ArrowLeft size={18} style={{ color: appearance.accentColor }} />
            {error || "Ticket not found."}
          </button>
        )}
        {exitError ? (
          <p className="mt-3 text-center text-xs" style={{ color: C.coral }}>{exitError}</p>
        ) : null}
      </section>
      <PageFooter color={`${appearance.fontColor}66`} className="qp-ticket-page-footer pt-3" />
      <ConfirmDialog
        confirmAction={exitConfirmOpen ? {
          title: "Are you sure?",
          message: "You will lose your position in the queue.",
          confirmLabel: exitPending ? "Deleting..." : "Exit queue",
          variant: "destructive",
          icon: "exclamation",
        } : null}
        onCancel={() => {
          if (!exitPending) setExitConfirmOpen(false);
        }}
        onConfirm={handleExit}
        theme={{ ...appearance, themeMode: "Light" }}
      />
    </main>
  );
}
