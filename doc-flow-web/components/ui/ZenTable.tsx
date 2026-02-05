import * as React from "react";
import { cn } from "@/lib/utils";

const ZenTable = React.forwardRef<
    HTMLTableElement,
    React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto border rounded-sm bg-white shadow-sm">
        <table
            ref={ref}
            className={cn("w-full caption-bottom text-sm tabular-nums", className)}
            {...props}
        />
    </div>
));
ZenTable.displayName = "ZenTable";

const ZenTableHeader = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b bg-slate-50/50", className)} {...props} />
));
ZenTableHeader.displayName = "ZenTableHeader";

const ZenTableBody = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <tbody
        ref={ref}
        className={cn("[&_tr:last-child]:border-0", className)}
        {...props}
    />
));
ZenTableBody.displayName = "ZenTableBody";

const ZenTableFooter = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <tfoot
        ref={ref}
        className={cn(
            "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
            className
        )}
        {...props}
    />
));
ZenTableFooter.displayName = "ZenTableFooter";

const ZenTableRow = React.forwardRef<
    HTMLTableRowElement,
    React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
    <tr
        ref={ref}
        className={cn(
            "border-b transition-colors hover:bg-slate-50/60 data-[state=selected]:bg-slate-50",
            className
        )}
        {...props}
    />
));
ZenTableRow.displayName = "ZenTableRow";

const ZenTableHead = React.forwardRef<
    HTMLTableCellElement,
    React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
    <th
        ref={ref}
        className={cn(
            "h-9 px-3 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&:has([role=checkbox])]:w-[1%]",
            className
        )}
        {...props}
    />
));
ZenTableHead.displayName = "ZenTableHead";

const ZenTableCell = React.forwardRef<
    HTMLTableCellElement,
    React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
    <td
        ref={ref}
        className={cn(
            "p-2 align-middle [&:has([role=checkbox])]:pr-0 whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]",
            className
        )}
        {...props}
    />
));
ZenTableCell.displayName = "ZenTableCell";

const ZenTableCaption = React.forwardRef<
    HTMLTableCaptionElement,
    React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
    <caption
        ref={ref}
        className={cn("mt-4 text-sm text-muted-foreground", className)}
        {...props}
    />
));
ZenTableCaption.displayName = "ZenTableCaption";

export {
    ZenTable,
    ZenTableHeader,
    ZenTableBody,
    ZenTableFooter,
    ZenTableHead,
    ZenTableRow,
    ZenTableCell,
    ZenTableCaption,
};
