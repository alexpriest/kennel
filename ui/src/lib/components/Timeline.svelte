<script lang="ts">
  import { layoutTimeline, hourOf, hourLabel, domainShort, type Ran, type Upcoming } from '../model';
  import { store } from '../store.svelte';

  let { ran, upcoming }: { ran: Ran[]; upcoming: Upcoming[] } = $props();

  let width = $state(0);
  const narrow = $derived(typeof window !== 'undefined' && window.innerWidth <= 760);
  const labelW = $derived(narrow ? 58 : 76);

  const events = $derived([
    ...ran.map(r => ({ h: hourOf(r.at), job: r.job, s: r.ok ? 'done' : 'fail' })),
    ...upcoming.filter(u => u.at.getDate() === store.now.getDate()).map(u => ({ h: hourOf(u.at), job: u.job, s: 'next' })),
  ]);
  const lanes = $derived([...new Set(events.map(e => e.job.domain))]);
  const nowH = $derived(hourOf(store.now));
  const layout = $derived(layoutTimeline(events.map(e => e.h), nowH, Math.max(120, width - labelW)));
  const ticks = $derived.by(() => {
    const hours = [0, ...events.map(e => e.h).sort((a, b) => a - b), 24];
    const out: { h: number; x: number }[] = [];
    let last = -999;
    for (const h of hours) {
      const x = layout.x(h);
      if (x - last < 58) continue;
      last = x;
      out.push({ h, x });
    }
    return out;
  });

  let tip = $state<{ text: string; sub: string; x: number; y: number } | null>(null);
  function showTip(e: Event, text: string, sub: string) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    tip = { text, sub, x: r.left + r.width / 2, y: r.top };
  }
  const subFor = (h: number, s: string) => `${hourLabel(h)} · ${s === 'done' ? 'succeeded' : s === 'fail' ? 'failed' : 'scheduled'}`;
</script>

<div class="tl" bind:clientWidth={width}>
  {#each lanes as d}
    <div class="tl-lane">
      <span class="tl-lane-label"><span class="dot" style="background: var(--{d}, var(--mac))"></span>{domainShort(d)}</span>
      <div class="tl-track">
        {#each layout.segments as seg}<span class="tl-seg" style="left:{seg.x}px;width:{seg.w}px"></span>{/each}
        {#each layout.folds as f}
          <span class="tl-gap" role="img" aria-label="{hourLabel(f.from)} to {hourLabel(f.to)}, nothing scheduled" style="left:{f.x}px;width:{f.w}px"
            onpointerenter={e => showTip(e, `${hourLabel(f.from)} to ${hourLabel(f.to)}`, 'nothing scheduled')} onpointerleave={() => (tip = null)}><svg><use href="#i-fold" /></svg></span>
        {/each}
        {#each events.filter(e => e.job.domain === d) as e}
          <a class="tl-ev" class:done={e.s === 'done'} class:fail={e.s === 'fail'} href="#job/{encodeURIComponent(e.job.id)}" style="left:{layout.x(e.h)}px"
            aria-label="{e.job.name}, {subFor(e.h, e.s)}"
            onpointerenter={ev => showTip(ev, e.job.name, subFor(e.h, e.s))} onpointerleave={() => (tip = null)}
            onfocus={ev => showTip(ev, e.job.name, subFor(e.h, e.s))} onblur={() => (tip = null)}></a>
        {/each}
      </div>
    </div>
  {/each}
  <div class="tl-axis" style="margin-left:{labelW}px">
    {#each ticks as t}
      <span class="tl-x" style="left:{t.x}px;{t.h === 0 ? 'transform:none' : t.h === 24 ? 'transform:translateX(-100%)' : ''}">{hourLabel(t.h % 24)}</span>
    {/each}
  </div>
  <span class="tl-now" style="left:{labelW + layout.x(nowH)}px"><span>NOW</span></span>
</div>
<div class="tip" class:show={!!tip} role="tooltip" style="left:{tip?.x ?? 0}px;top:{tip?.y ?? 0}px">{tip?.text}<small>{tip?.sub}</small></div>
