# Sidebar research — what I applied

Checked 2026-10-06 with headless Chrome renders and page fetches. Only the findings that changed the design are listed.

## Rows and states

1. **Row height 32–40px, icon + label, no borders.** Linear's app sidebar (linear.app hero screenshot) runs ~32px rows at 13–14px with 16px icons; a public clone measures `px-2 py-1.5` rows, hover `#26262b`, active `#2a2a30` — two fills, no outlines. Things 3 (culturedcode.com) uses icon + label rows with counts right-aligned in grey. Craft (owner's screenshot) uses ~44px rows with a 16px icon column. Applied: 36px rows, 18px icons, 16px labels, counts right-aligned and tabular.
   - https://linear.app/ · https://dev.to/dev48v/i-cloned-linears-sidebar-in-50-lines-of-html-one-file-zero-npm-40ej · https://culturedcode.com/things/
2. **Active ≠ hover ≠ focus, and never a box.** Guides agree the current item should be "unmistakable: a filled background… a left border, or both", hover "a light background shift, 5–10%", focus "a visible 2–3px ring, not colour alone". Craft, Things and Linear all mark selection with a soft fill; Dia with a raised row. Applied: active = full-bleed raised fill + 3px ink bar on the sidebar's left edge + 700 weight; hover = half-step tint; focus = inset 2px ink ring.
   - https://www.alfdesigngroup.com/post/improve-your-sidebar-design-for-web-apps
3. **Today's count in red, others grey.** Things 3 badges Today in red and leaves other counts grey. Applied.
4. **Group headers small, tracked, with air above.** 11–12px uppercase, 16–24px before a group (alfdesigngroup); Craft's "Starred / Folders / Tags"; Linear's dim "Workspace ▾ / Favorites ▾". Applied: 12px/600/.08em headers with 22px above.
5. **Two levels max, succinct group labels, icons carry meaning when coloured.** Apple HIG Sidebars: "show no more than two levels", "use succinct, descriptive labels to title each group", fixed icon colours only when they "serve a clear purpose" (Mail's VIP yellow), and "avoid putting critical information or actions at the bottom". Applied: domain filters get a colour swatch (their only fixed colour), views stay ink; only the quiet "live" indicator sits at the bottom.
   - https://developer.apple.com/design/human-interface-guidelines/sidebars

## Search vs navigation

6. **Search looks like an input, not a row.** Raycast: ~44px bar, magnifier at left, placeholder text, keycap hint ~20px at right; list rows are plain fills. Applied: a hairline-bordered field with magnifier, grey placeholder "Jump to…" and a ⌘K keycap; nav rows have no border, so the two can't be confused.
   - https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/raycast/DESIGN.md

## Pretext

7. **API used:** `prepareRichInline` → `layoutNextRichInlineLineRange(prepared, maxWidth, start)` → `materializeRichInlineLineRange`, fonts loaded first with `document.fonts.load`. The Dynamic Layout demo routes each line at a different width around obstacles; that is the mechanism for flowing the verdict around Digs's silhouette. Verified the jsDelivr `+esm` build and its `rich-inline` subpath load in headless Chrome.
   - https://github.com/chenglou/pretext · https://chenglou.me/pretext/dynamic-layout/
