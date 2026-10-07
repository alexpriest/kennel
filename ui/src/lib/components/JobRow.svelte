<script lang="ts">
  import type { Job } from '../model';
  import { store } from '../store.svelte';
  import Glyph from './Glyph.svelte';
  import Tag from './Tag.svelte';

  let { job, col1, col2, mono = false }: { job: Job; col1: string; col2?: string; mono?: boolean } = $props();
  const problem = $derived(store.problem(job));
</script>

<a class="vt-row" role="option" aria-selected="false" tabindex="-1" href="#job/{encodeURIComponent(job.id)}" data-problem={problem ? job.id : undefined} style="color: inherit; text-decoration: none">
  <Glyph {job} />
  <div class="vt-name">
    <b>{job.name} {#if job.own}<Tag domain={job.domain} />{/if}</b>
    <span class:mono>{mono ? job.id : job.purpose || job.id}</span>
  </div>
  <div class="vt-col">{col1}</div>
  <div class="vt-col">
    {#if col2 !== undefined}{col2}
    {:else if problem}<span class="state warn">{problem.kind === 'missed' ? 'Missed a run' : `Failed${job.scheduled?.lastRun?.exitCode != null ? `, exit ${job.scheduled.lastRun.exitCode}` : ''}`}</span>
    {:else if job.scheduled?.schedule === 'paused'}<span class="state idle">Paused</span>
    {:else if job.scheduled?.last === 'running'}<span class="state">Running now</span>
    {:else if job.scheduled?.last === 'never'}<span class="state idle">Not run yet</span>
    {:else if job.scheduled?.last === 'ok'}<span class="state ok"><svg class="check"><use href="#i-check" /></svg>Fine</span>
    {:else}<span class="state idle">No record</span>{/if}
  </div>
  <svg class="chev"><use href="#i-chev" /></svg>
</a>
