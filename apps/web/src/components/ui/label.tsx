import { type LabelHTMLAttributes, forwardRef } from "react";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  function Label({ required, children, className = "", ...props }, ref) {
    return (
      <label
        ref={ref}
        className={[
          "block text-base font-medium text-gray-700",
          className,
        ].join(" ")}
        {...props}
      >
        {children}
        {required && (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
    );
  }
);
