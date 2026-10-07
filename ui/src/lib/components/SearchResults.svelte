<script lang="ts">
  import { store } from '../store.svelte';
  import { ui } from '../ui.svelte';
  import { KIND_LABELS } from '../model';
  import JobRow from './JobRow.svelte';

  const rows = $derived(store.jobs.filter(j => ui.matches(j)).sort((a, b) => Number(b.own) - Number(a.own) || a.name.localeCompare(b.name)));
</script>

<header class="head"><h1>Search</h1><p>{rows.length} job{rows.length === 1 ? '' : 's'} match “{ui.search}”. Enter opens the first.</p></header>
<section>
  <div class="vt-head"><span></span><span>Job</span><span>Kind</span><span>Last result</span><span></span></div>
  {#each rows as job (job.id)}<JobRow {job} col1={job.own ? KIND_LABELS[job.kind] : 'Third-party'} />{/each}
</section>
