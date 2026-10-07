<script lang="ts">
  import { store } from '../store.svelte';
  import { ui, jobsFor } from '../ui.svelte';
  import { digs } from '../digs.svelte';
  import { when, dur, type Job } from '../model';
  import ViewHead from './ViewHead.svelte';
  import Glyph from './Glyph.svelte';
  import Tag from './Tag.svelte';

  const rows = $derived(jobsFor('agents', store.jobs).filter(j => ui.inDomain(j))
    .sort((a, b) => Date.parse(a.scheduled?.nextRun ?? '9999') - Date.parse(b.scheduled?.nextRun ?? '9999')));

  async function run(event: MouseEvent, job: Job) {
    event.preventDefault();
    event.stopPropagation();
    digs.react('alert', null, 1500);
    await store.act(job, 'start', 'Starting');
  }
</script>

<ViewHead title="Agents" blurb="Scheduled Claude sessions that work from a task doc in your vault." {rows} />
<div class="cards">
  {#each rows as job (job.id)}
    {@const last = job.scheduled?.lastRun}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <div class="card" role="group" aria-label={job.name} data-open={job.id} data-problem={store.problem(job) ? job.id : undefined} onclick={() => (location.hash = `#job/${encodeURIComponent(job.id)}`)}>
      <div class="card-top"><Glyph {job} /><b><a href="#job/{encodeURIComponent(job.id)}" style="color: inherit; text-decoration: none">{job.name}</a></b><Tag domain={job.domain} /></div>
      <p>{job.purpose ?? ''}</p>
      <dl>
        <dt>Schedule</dt><dd>{job.schedule}</dd>
        <dt>Next</dt><dd>{when(job.scheduled?.nextRun, store.now) || 'Not scheduled'}</dd>
        <dt>Last run</dt><dd>{last ? `${when(last.startedAt, store.now)}${last.durationS != null ? ` · ${dur(last.durationS)}` : ''}` : 'Not yet'}</dd>
      </dl>
      <div class="card-actions">
        <button class="btn" type="button" disabled={!!store.pending[job.id]} onclick={e => run(e, job)}>{store.pending[job.id] ?? 'Run now'}</button>
        {#if job.scheduled?.docUrl}<a class="btn quiet" href={job.scheduled.docUrl} onclick={e => e.stopPropagation()}>Task doc</a>{/if}
      </div>
    </div>
  {/each}
</div>
