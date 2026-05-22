export default function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-bg-secondary">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="font-mono text-sm font-bold text-accent-gold tracking-widest mb-2">SGXPTY</p>
            <p className="text-xs text-text-muted leading-relaxed">
              Professional-grade SGX REIT and ETF intelligence platform for institutional
              and retail investors. Built for the Singapore market.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Data Sources</p>
            <ul className="space-y-1 text-xs text-text-muted">
              <li>REITAS — S-REIT Industry Overview</li>
              <li>SGX iEdge S-REIT Index</li>
              <li>SGInvestors REIT Database</li>
              <li>Yahoo Finance (live quotes)</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Disclaimer</p>
            <p className="text-xs text-text-muted leading-relaxed">
              For informational purposes only. Not financial advice. Data may be delayed
              or inaccurate. Always consult a licensed financial adviser before investing.
            </p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] text-text-muted">
            &copy; {new Date().getFullYear()} SGXPTY. All rights reserved.
          </p>
          <p className="text-[10px] text-text-muted font-mono">
            SGX Data • Live via Yahoo Finance
          </p>
        </div>
      </div>
    </footer>
  );
}
