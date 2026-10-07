<script lang="ts">
  import type { Job } from '../model';
  import { store } from '../store.svelte';
  import { digs } from '../digs.svelte';
  import Tag from './Tag.svelte';

  let { job }: { job: Job } = $props();
  const problem = $derived(store.problem(job));
  const down = $derived(problem?.kind === 'down' || problem?.kind === 'flapping');
  const href = $derived(`#job/${encodeURIComponent(job.id)}`);

  function fix() {
    digs.react('alert', 'On it', 1800);
    void store.askClaude(job);
  }
</script>

<div class="attn" class:is-down={down} role="status" data-problem={job.id}>
  <svg class="i"><use href="#i-alert" /></svg>
  <a class="attn-body" {href} style="color: inherit; text-decoration: none">
    <div class="attn-title">{job.name} <Tag domain={job.domain} /></div>
    <div class="attn-meta">{problem?.text} {job.purpose ?? ''}</div>
  </a>
  <div class="attn-actions">
    <button class="btn primary" type="button" onclick={fix}>Ask Claude to fix</button>
    <a class="btn" {href}>Details</a>
    <button class="btn quiet" type="button" onclick={() => store.mute(job.id)}>Mute</button>
  </div>
</div>
