<script lang="ts">
  import { store } from '../store.svelte';
  import { ui, jobsFor } from '../ui.svelte';
  import { cadenceOf, type Job } from '../model';
  import ViewHead from './ViewHead.svelte';
  import JobRow from './JobRow.svelte';

  const rows = $derived(jobsFor('scheduled', store.jobs).filter(j => ui.inDomain(j)));
  const problems = $derived(rows.filter(j => store.problem(j)));
  const groups = $derived.by(() => {
    const map = new Map<number, { name: string; items: Job[] }>();
    for (const j of rows.filter(j => !store.problem(j))) {
      const [rank, name] = cadenceOf(j);
      if (!map.has(rank)) map.set(rank, { name, items: [] });
      map.get(rank)!.items.push(j);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => ({ ...g, items: g.items.sort((a, b) => a.name.localeCompare(b.name)) }));
  });
</script>

<ViewHead title="Scheduled" blurb="Jobs that run on a timer, then go quiet until next time." {rows} />
<section>
  <div class="vt-head"><span></span><span>Job</span><span>Schedule</span><span>Last result</span><span></span></div>
  {#if problems.length}
    <div class="vt-group">Needs a look <small>{problems.length}</small></div>
    {#each problems as job (job.id)}<JobRow {job} col1={job.schedule ?? ''} />{/each}
  {/if}
  {#each groups as g (g.name)}
    <div class="vt-group">{g.name} <small>{g.items.length}</small></div>
    {#each g.items as job (job.id)}<JobRow {job} col1={job.schedule ?? ''} />{/each}
  {/each}
</section>
