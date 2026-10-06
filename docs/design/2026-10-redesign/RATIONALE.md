# Kennel Today — rationale

**Idea:** an ink-on-cream comic page. Digs, a line drawing, reacts in the splash panel while the verdict flows around his silhouette; the day is a strip with the loops drawn as water lines; the 59 fine jobs are a cast list, so only the broken job has weight.

**Sidebar (rebuilt from RESEARCH.md).** A deeper-cream margin column with one ink rule; Digs's head and the indicia in the corner. Search is an input (hairline border, magnifier, placeholder, ⌘K keycap), not a row. Rows are 36px, icon + label + right-aligned count, Today's in red. Active = raised fill + 3px ink bar + bold; hover = tint; focus = inset ring. Domain filters are a separate swatch-labelled group. Phone: top drawer.

**Digs + Pretext.** Four drawings, one per state. The page reads each drawing's alpha on an offscreen canvas, finds the leftmost inked pixel per text-line band, and Pretext breaks each verdict line at that width, so the words hug his outline and reflow when the state changes. No animation beyond a 2px hover rise, off under reduced motion.

**Type and colour.** Rubik only. Red once, as the caption tab; OK is ink; domains muted.
