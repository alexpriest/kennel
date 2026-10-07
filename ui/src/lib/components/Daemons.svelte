<script lang="ts">
  import { store } from '../store.svelte';
  import { ui, jobsFor } from '../ui.svelte';
  import { dur, when } from '../model';
  import ViewHead from './ViewHead.svelte';
  import Glyph from './Glyph.svelte';
  import Tag from './Tag.svelte';

  const rows = $derived(jobsFor('daemons', store.jobs).filter(j => ui.inDomain(j))
    .sort((a, b) => Number(!!store.problem(b)) - Number(!!store.problem(a)) || a.name.localeCompare(b.name)));
  const uptime = (iso: string | null | undefined) => iso ? dur((store.now.getTime() - new Date(iso).getTime()) / 1000) : '';
</script>

<ViewHead title="Daemons" blurb="Long-running services that should always be up." {rows} />
<div class="tiles">
  {#each rows as job (job.id)}
    {@const problem = store.problem(job)}
    {@const down = job.daemon?.state === 'down'}
    <a class="tile" class:is-down={!!problem} href="#job/{encodeURIComponent(job.id)}" data-problem={problem ? job.id : undefined} style="color: inherit; text-decoration: none">
      <span class="tile-top"><Glyph {job} /><b>{job.name}</b><Tag domain={job.domain} /></span>
      <span class="tile-purpose">{job.purpose ?? ''}</span>
      <span class="tile-meta">
        {#if down}<span>Not running{job.daemon?.lastExit != null ? `, last exit ${job.daemon.lastExit}` : ''}</span>
        {:else if problem}<span>{problem.text}</span>
        {:else}
          {#if job.daemon?.startedAt}<span>Up {uptime(job.daemon.startedAt)}</span>{/if}
          {#if job.daemon?.memoryMb != null}<span>{job.daemon.memoryMb} MB</span>{/if}
          {#if (job.daemon?.processes ?? 0) > 1}<span>{job.daemon?.processes} processes</span>{/if}
        {/if}
      </span>
    </a>
  {/each}
</div>
