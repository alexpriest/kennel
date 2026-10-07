<script lang="ts">
  import { store } from '../store.svelte';
  import { jobsFor } from '../ui.svelte';
  import ViewHead from './ViewHead.svelte';
  import JobRow from './JobRow.svelte';

  const rows = $derived(jobsFor('hidden', store.jobs).sort((a, b) => a.name.localeCompare(b.name)));
  const status = (j: (typeof rows)[number]) => (j.daemon ? (j.daemon.state === 'up' ? 'Running' : 'Not running') : j.scheduled?.last === 'running' ? 'Running' : 'Idle');
</script>

<ViewHead title="Mac and third-party" blurb="Background items from macOS and other apps. Never alerted on." {rows} alerts={false} />
<section>
  <div class="vt-head"><span></span><span>Item</span><span>Status</span><span>Runs under</span><span></span></div>
  {#each rows as job (job.id)}<JobRow {job} col1={status(job)} col2={job.backend} mono />{/each}
</section>
