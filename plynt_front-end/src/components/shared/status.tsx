import { CircleAlert,CircleCheck,Clock3,FileText,LoaderCircle } from "lucide-react";
import type { InvoiceStatus,TransactionStatus } from "@/types";
import { cn } from "@/lib/utils";

export function TransactionStatusBadge({status}:{status:TransactionStatus}){
  const Icon=status==="confirmed"?CircleCheck:status==="pending"?LoaderCircle:CircleAlert;
  return <span className={cn("status",status==="confirmed"&&"status-strong")}><Icon className={cn("size-3.5",status==="pending"&&"animate-spin")}/>{status}</span>
}

export function InvoiceStatusBadge({status}:{status:InvoiceStatus}){
  const cfg={
    draft:   {Icon:FileText,   label:"Draft",   desc:"Not yet sent",       cls:"bg-muted text-muted-foreground border-border"},
    pending: {Icon:Clock3,     label:"Pending", desc:"Awaiting payment",   cls:"bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800"},
    paid:    {Icon:CircleCheck,label:"Paid",    desc:"Payment received",   cls:"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"},
    overdue: {Icon:CircleAlert,label:"Overdue", desc:"Past due date",      cls:"bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800"},
  }[status]??{Icon:FileText,label:"Draft",desc:"",cls:"bg-muted text-muted-foreground border-border"};
  return(
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap",cfg.cls)} title={cfg.desc}>
      <cfg.Icon className="size-3"/>
      {cfg.label}
    </span>
  );
}
