import { C } from "../../lib/theme";

export function PageFooter({ color = C.textFaint, className = "" }) {
  return (
    <footer className={`w-full py-3 text-center text-[11px] leading-tight ${className}`}>
      <a
        href="https://waitqr.com"
        title="waitqr.com"
        className="qp-focusable underline-offset-2 hover:underline"
        style={{ color }}
      >
        WaitQR
      </a>{" "}
      <span style={{ color }}>© {new Date().getFullYear()} All rights reserved.</span>
    </footer>
  );
}
