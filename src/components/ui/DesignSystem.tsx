import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'google';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap shrink-0 rounded-lg transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5D78E] disabled:opacity-50 disabled:pointer-events-none select-none';

  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'h-9 px-3.5 text-xs',
    md: 'h-11 px-5 text-sm',
    lg: 'h-12 px-6 text-sm',
  };

  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[#D4AF70] text-[#090A0F] font-semibold hover:bg-[#F5D78E] active:scale-[0.99] shadow-[0_6px_20px_rgba(212,175,112,0.18)]',
    secondary:
      'bg-[#171821] text-[#F7F3EA] border border-[rgba(212,175,112,0.24)] hover:bg-[#20212B] hover:border-[rgba(245,215,142,0.45)]',
    ghost:
      'bg-transparent text-[#AAA6A0] hover:text-[#F7F3EA] hover:bg-[#171821]/70',
    danger:
      'bg-[#2A1519] text-[#F5B8B8] border border-[#7F2D37] hover:bg-[#3A1B20]',
    google:
      'bg-white/95 text-[#090A0F] font-semibold border border-white/40 backdrop-blur-md hover:bg-white shadow-[0_10px_28px_rgba(0,0,0,0.42)] active:scale-[0.99]',
  };

  return (
    <button
      type={props.type ?? 'button'}
      disabled={disabled || loading}
      data-cursor="button"
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}

export function SurfaceCard({
  children,
  className = '',
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      data-cursor={interactive ? 'card' : undefined}
      className={`rounded-xl bg-[#171821] border border-[rgba(212,175,112,0.18)] ${
        interactive
          ? 'transition-all duration-200 hover:border-[rgba(245,215,142,0.38)] hover:bg-[#1A1C26]'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  rightAdornment?: React.ReactNode;
}

export function TextInput({
  label,
  error,
  hint,
  rightAdornment,
  id,
  className = '',
  ...props
}: TextInputProps) {
  const inputId = id || `input-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-xs font-medium tracking-wide text-[#AAA6A0]"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          className={`h-11 w-full rounded-lg bg-[#11121A] px-3.5 text-sm text-[#F7F3EA] placeholder:text-[#6F6B66] border transition-colors focus:outline-none focus:ring-2 focus:ring-[#D4AF70]/40 ${
            rightAdornment ? 'pr-10' : ''
          } ${
            error
              ? 'border-[#C95E63]'
              : 'border-[rgba(212,175,112,0.2)] focus:border-[#D4AF70]'
          } ${className}`}
          {...props}
        />
        {rightAdornment && (
          <div className="absolute inset-y-0 right-2 flex items-center">{rightAdornment}</div>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-[#F29C9F]">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-[#7D7973]">{hint}</p>
      ) : null}
    </div>
  );
}

export function ProgressBar({
  value,
  label,
  showValue = true,
}: {
  value: number;
  label?: string;
  showValue?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="space-y-1.5">
      {(label || showValue) && (
        <div className="flex items-center justify-between gap-4 text-xs">
          {label && <span className="text-[#AAA6A0] truncate">{label}</span>}
          {showValue && (
            <span className="font-mono-tabular text-[#F5D78E] shrink-0">{clamped}%</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
        className="h-1.5 w-full overflow-hidden rounded-full bg-[#20212B]"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#A88A59] via-[#D4AF70] to-[#F5D78E] transition-all duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export function ModalDialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A0F]/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-xl bg-[#171821] border border-[rgba(212,175,112,0.28)] shadow-[0_24px_70px_rgba(0,0,0,0.65)]">
        <div className="flex items-center justify-between border-b border-[rgba(212,175,112,0.14)] px-6 py-4">
          <h3 className="font-display text-base font-semibold text-[#F7F3EA]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#AAA6A0] hover:bg-[#20212B] hover:text-[#F7F3EA]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function SkeletonBlock({ className = 'h-20 w-full' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-[#20212B]/70 border border-[rgba(212,175,112,0.08)] ${className}`}
    />
  );
}

export function ToastBanner({
  message,
  tone = 'info',
  onDismiss,
}: {
  message: string | null;
  tone?: 'info' | 'success' | 'error';
  onDismiss?: () => void;
}) {
  if (!message) return null;
  const toneStyles =
    tone === 'error'
      ? 'bg-[#261418] border-[#8A3940] text-[#F5C2C4]'
      : tone === 'success'
      ? 'bg-[#17211C] border-[#4B7F61] text-[#D2EAD9]'
      : 'bg-[#1A1A22] border-[rgba(212,175,112,0.32)] text-[#F7F3EA]';

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm ${toneStyles}`}
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="text-xs opacity-75 hover:opacity-100"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

export function ResilientImage({
  src,
  alt,
  fallbackTitle,
  className = '',
}: {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}) {
  const [errored, setErrored] = React.useState(false);

  if (errored || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gradient-to-br from-[#171821] via-[#11121A] to-[#090A0F] border border-[rgba(212,175,112,0.18)] p-6 text-center ${className}`}
      >
        <div className="space-y-1">
          <p className="font-display text-sm font-semibold text-[#D4AF70]">{fallbackTitle}</p>
          <p className="text-xs text-[#AAA6A0]">SkillPath AI Visual</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className={className}
    />
  );
}

export function GoogleLogoSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.3 0 6.08-1.09 8.11-2.96l-3.88-3.05c-1.09.73-2.48 1.16-4.23 1.16-3.25 0-6.01-2.19-6.99-5.14H1.01v3.14C3.03 21.17 7.21 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.01 14.01c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.15H1.01C.37 7.42 0 8.85 0 11.65s.37 4.23 1.01 5.5l4-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.8 0 3.41.62 4.68 1.83l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.03 2.83 1.01 6.85l4 3.14c.98-2.95 3.74-5.24 6.99-5.24Z"
      />
    </svg>
  );
}
