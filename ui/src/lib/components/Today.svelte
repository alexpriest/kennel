<script lang="ts">
  import { store } from '../store.svelte';
  import { ui } from '../ui.svelte';
  import { todayLists, clock, when, dur } from '../model';
  import Tag from './Tag.svelte';
  import AttnRow from './AttnRow.svelte';
  import Timeline from './Timeline.svelte';

  const own = $derived(store.jobs.filter(j => j.own));
  const lists = $derived(todayLists(store.jobs, store.now));
  const ran = $derived(lists.ranToday.filter(r => ui.inDomain(r.job)));
  const upcoming = $derived(lists.comingUp.filter(u => ui.inDomain(u.job)));
  const problems = $derived(store.problems.filter(j => ui.inDomain(j)));
  const dateLine = $derived(store.now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }));
  const link = (id: string) => `#job/${encodeURIComponent(id)}`;
  const UPCOMING_ROWS = 6;
  function lastRunNote(j: (typeof own)[number]): string {
    const s = j.scheduled;
    if (s?.last === 'never') return 'First run';
    if (s?.lastRun?.durationS != null) return `Last run took ${dur(s.lastRun.durationS)}`;
    return '';
  }
</script>

<header class="head">
  <h1>Today</h1>
  <p>{dateLine} · {own.length - store.problems.length} of {own.length} jobs healthy</p>
</header>

{#each problems as job (job.id)}<AttnRow {job} />{/each}

<section aria-labelledby="tl-h">
  <h2 id="tl-h">Today's runs <small>quiet hours folded</small></h2>
  {#if ran.length || upcoming.length}
    <Timeline {ran} {upcoming} />
  {/if}
  {#if lists.frequent.total}
    <div class="tl-loops"><i></i>Plus {lists.frequent.total} jobs that run every few minutes{lists.frequent.healthy === lists.frequent.total ? ', all healthy' : `, ${lists.frequent.total - lists.frequent.healthy} need a look`}</div>
  {/if}
</section>

<section aria-labelledby="up">
  <h2 id="up">Coming up</h2>
  <div class="list">
    {#each upcoming.slice(0, UPCOMING_ROWS) as u (u.job.id)}
      <a class="row" href={link(u.job.id)} style="color: inherit; text-decoration: none">
        <span class="time">{when(u.at, store.now)}</span>
        <span class="name"><b>{u.job.name}</b><Tag domain={u.job.domain} /></span>
        <span class="state">{lastRunNote(u.job)}</span>
      </a>
    {:else}
      <p class="empty-view">Nothing else scheduled in the next day.</p>
    {/each}
  </div>
  {#if upcoming.length > UPCOMING_ROWS}
    <div class="tl-loops"><a href="#scheduled" style="color: inherit">{upcoming.length - UPCOMING_ROWS} more in the next day</a></div>
  {/if}
</section>

<section aria-labelledby="ran">
  <h2 id="ran">Ran today <small>{ran.length} runs</small></h2>
  <div class="list">
    {#each ran as r (r.job.id)}
      <a class="row" href={link(r.job.id)} style="color: inherit; text-decoration: none">
        <span class="time">{clock(r.at)}</span>
        <span class="name"><b>{r.job.name}</b><Tag domain={r.job.domain} /></span>
        {#if r.ok}
          <span class="state ok"><svg class="check"><use href="#i-check" /></svg>Succeeded{r.durationS != null ? ` · ${dur(r.durationS)}` : ''}</span>
        {:else}
          <span class="state warn">Failed</span>
        {/if}
      </a>
    {:else}
      <p class="empty-view">Nothing has run yet today.</p>
    {/each}
  </div>
</section>
