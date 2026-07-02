import { forwardRef, type SelectHTMLAttributes } from "react";
import clsx from "clsx";
import { fieldClassName } from "./Input";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ children, className, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={clsx(fieldClassName, "appearance-none pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
        v
      </span>
    </div>
  )
);

Select.displayName = "Select";
