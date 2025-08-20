// ./components/Footer.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Footer() {
  const { pathname } = useLocation();
  const year = new Date().getFullYear();

  return (
    <footer className="siteFooter" role="contentinfo">
      <style>{`
        .siteFooter{
          background: var(--color-bg);
          border-top: var(--border-width) solid var(--color-border);
        }
        .footerInner{
          max-width: 1100px;
          margin: 0 auto;
          padding: 12px;                    /* mniejsze */
          display: flex;
          flex-direction: column;           /* centrum w pionie */
          align-items: center;              /* centrum w poziomie */
          justify-content: center;
          gap: 8px;                         /* mniejsze odstępy */
          text-align: center;               /* środek */
        }
        .footerNav{
          list-style: none;
          display: flex;
          justify-content: center;          /* linki na środku */
          gap: 8px;                         /* nieco mniejsza przerwa */
          padding: 0;
          margin: 0;
          flex-wrap: wrap;
        }
        .footerLink{
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 10px;                /* mniejszy przycisk */
          min-height: 36px;                 /* było ~40+ */
          border-radius: var(--radius-md);
          border: var(--border-width) solid var(--color-border);
          background: #fff;
          color: var(--color-primary-700);
          font-weight: 700;
          font-size: 13px;                  /* odrobinę mniejsze */
          text-decoration: none;
          box-shadow: var(--shadow-sm);
          transition: transform .05s ease-out, background .15s ease-out, border-color .15s ease-out;
        }
        .footerLink:hover{
          background: color-mix(in srgb, var(--color-primary-500) 10%, #fff);
        }
        .footerLink:active{
          transform: translateY(1px);
        }
        .footerLink.active{
          background: color-mix(in srgb, var(--color-primary-500) 16%, #fff);
          border-color: var(--color-border);
        }
        .footerLink:focus-visible{
          outline: none;
          border-color: var(--focus-ring);
          box-shadow: 0 0 0 var(--focus-width) color-mix(in srgb, var(--focus-ring) 35%, transparent);
        }
        .copy{
          font-size: 12px;                  /* mniejsze */
          color: var(--color-text-muted);
          white-space: nowrap;
        }
        @media (max-width: 640px){
          .footerInner{
            padding: 10px;
            gap: 10px;
          }
          .footerNav{
            gap: 8px;
          }
        }
      `}</style>

      <div className="footerInner">
        <nav aria-label="Stopka">
          <ul className="footerNav">
            <li>
              <Link
                to="/about"
                className={`footerLink ${pathname === "/about" ? "active" : ""}`}
                aria-current={pathname === "/about" ? "page" : undefined}
              >
                O Nas
              </Link>
            </li>
            <li>
              <Link
                to="/privacy"
                className={`footerLink ${pathname === "/privacy" ? "active" : ""}`}
                aria-current={pathname === "/privacy" ? "page" : undefined}
              >
                Polityka Prywatności
              </Link>
            </li>
            <li>
              <Link
                to="/contact"
                className={`footerLink ${pathname === "/contact" ? "active" : ""}`}
                aria-current={pathname === "/contact" ? "page" : undefined}
              >
                Kontakt
              </Link>
            </li>
          </ul>
        </nav>

        <div className="copy">© {year} Vet4You</div>
      </div>
    </footer>
  );
}
