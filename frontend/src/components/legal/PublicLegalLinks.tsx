import Link from "next/link";

import { cn } from "@/lib/utils";

interface PublicLegalLinksProps {
  className?: string;
  linkClassName?: string;
}

const LEGAL_LINKS = [
  {
    href: "/terms",
    label: "Syarat & Ketentuan",
  },
  {
    href: "/privacy",
    label: "Kebijakan Privasi",
  },
  {
    href: "/privacy#penghapusan-data",
    label: "Penghapusan Data",
  },
];

export function PublicLegalLinks({ className, linkClassName }: PublicLegalLinksProps) {
  return (
    <nav aria-label="Legal links" className={cn("flex flex-wrap items-center gap-4", className)}>
      {LEGAL_LINKS.map((item) => (
        <Link key={item.href} href={item.href} className={cn("transition-colors", linkClassName)}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}