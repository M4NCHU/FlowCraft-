import { forwardRef, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  block?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-slate-900 bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-400",
  secondary:
    "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-slate-300",
  ghost:
    "border border-transparent bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-300",
  danger:
    "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-300",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs font-medium",
  md: "h-10 px-4 text-sm font-medium",
  lg: "h-11 px-5 text-sm font-semibold",
};

export function buttonClassName({
  block = false,
  className,
  size = "md",
  variant = "secondary",
}: Pick<ButtonProps, "block" | "className" | "size" | "variant">) {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
    block && "w-full",
    sizeClasses[size],
    variantClasses[variant],
    className
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      block = false,
      className,
      size = "md",
      type = "button",
      variant = "secondary",
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      className={buttonClassName({ block, className, size, variant })}
      {...props}
    />
  )
);

Button.displayName = "Button";
