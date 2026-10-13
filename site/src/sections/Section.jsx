// The frame every section after the hero shares: a 40px title, a 20px lead, the section's own content, and a last
// line that is a verb pointing at the install (site/HOMEPAGE.md §2). Paper sections sit on the page; stage sections
// sit on the blue field. Scrolling a section into view marks it in the title strip's nav.
import { useEffect, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { usePage } from '../site/Sheet.jsx';
import { SPRING } from '../site/motion.js';

export function Section({ id, n, title, lead, children, cta = 'Run it on your repo', stage = false, className = '' }) {
  const ref = useRef(null);
  const page = usePage();
  const seen = useInView(ref, { amount: 0.35 });
  useEffect(() => {
    if (seen) page.setSheet(n);
  }, [seen]);
  return (
    <section ref={ref} id={id} aria-labelledby={`${id}-title`} className={`mx-auto flex w-full max-w-6xl scroll-mt-16 flex-col gap-10 px-6 py-24 md:px-12 ${className}`}>
      <motion.header
        initial={{ y: 12, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={SPRING.settle}
        className="flex max-w-2xl flex-col gap-3"
      >
        <h2 id={`${id}-title`} className="text-4xl font-semibold text-balance max-sm:text-2xl">
          {title}
        </h2>
        <p className="text-lg text-muted-foreground max-sm:text-base">{lead}</p>
      </motion.header>
      {children}
      {cta && (
        <a href="#install" className={`w-fit text-base font-semibold ${stage ? 'text-primary' : 'text-primary'} underline-offset-4 hover:underline`}>
          {cta} →
        </a>
      )}
    </section>
  );
}
