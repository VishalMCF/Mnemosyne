import Link from "next/link";
import type { ReactNode } from "react";
export function Heading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="s-heading">
      <div>
        <p className="s-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children && <p className="s-description">{children}</p>}
      </div>
      {action}
    </header>
  );
}
export function Panel({
  title,
  label,
  children,
  className = "",
}: {
  title?: string;
  label?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`s-panel ${className}`}>
      {title && (
        <div className="s-panel-heading">
          <h2>{title}</h2>
          {label}
        </div>
      )}
      {children}
    </section>
  );
}
export function ButtonLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link className={`s-button ${secondary ? "secondary" : ""}`} href={href}>
      {children}
    </Link>
  );
}
export function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div className="s-meter">
      <progress value={value} max={100} aria-label={label} />
    </div>
  );
}
export const Tag = ({ children }: { children: ReactNode }) => (
  <span className="s-tag">{children}</span>
);
export function Answer({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="s-answer">
      <span>{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? "Think first. Write in your own words…"}
      />
    </label>
  );
}
