import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes, forwardRef } from "react";

export const Table = forwardRef<
  HTMLTableElement,
  HTMLAttributes<HTMLTableElement>
>(function Table({ className = "", ...props }, ref) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        ref={ref}
        className={["w-full border-collapse text-base", className].join(" ")}
        {...props}
      />
    </div>
  );
});

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableHeader({ className = "", ...props }, ref) {
  return (
    <thead
      ref={ref}
      className={["border-b border-gray-200 bg-surface-subtle", className].join(" ")}
      {...props}
    />
  );
});

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableBody({ className = "", ...props }, ref) {
  return <tbody ref={ref} className={["divide-y divide-gray-100", className].join(" ")} {...props} />;
});

export const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(function TableRow({ className = "", ...props }, ref) {
  return (
    <tr
      ref={ref}
      className={["transition-colors hover:bg-surface-subtle", className].join(" ")}
      {...props}
    />
  );
});

export const TableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(function TableHead({ className = "", ...props }, ref) {
  return (
    <th
      ref={ref}
      className={[
        "px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide text-gray-500",
        className,
      ].join(" ")}
      {...props}
    />
  );
});

export const TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(function TableCell({ className = "", ...props }, ref) {
  return (
    <td
      ref={ref}
      className={["px-4 py-3 text-gray-700", className].join(" ")}
      {...props}
    />
  );
});
