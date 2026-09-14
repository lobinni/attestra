import Link from "next/link";

import { visibleNavigation } from "@/lib/features";

export function SiteFooter() {
  const links = visibleNavigation().filter((item) => item.href !== "/");

  return (
    <footer className="t-footer">
      <div className="t-shell t-footer-inner">
        <Link className="t-brand" href="/">
          <span className="t-mark">A</span>
          <strong>Attestra</strong>
          <span>Verified work</span>
        </Link>
        {links.length > 0 ? (
          <nav>
            {links.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
        <span className="footer-note">Test network build. Not audited.</span>
      </div>
    </footer>
  );
}
