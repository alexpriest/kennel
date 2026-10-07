<script lang="ts">
  import { glyphOf, type Job } from '../model';
  import { store } from '../store.svelte';
  let { job }: { job: Job } = $props();
  const glyph = $derived(glyphOf(job) === 'fail' && store.isMuted(job.id) ? 'ok' : glyphOf(job));
</script>

{#if glyph === 'fail'}
  <span class="g" style="color: var(--attn)" title="Needs a look"><svg><use href="#i-alert" /></svg></span>
{:else if glyph === 'down'}
  <span class="g" style="color: var(--down)" title="Down"><svg><use href="#i-alert" /></svg></span>
{:else if glyph === 'running'}
  <span class="g" title="Running"><span class="pulse"></span></span>
{:else if glyph === 'ok'}
  <span class="g" style="color: var(--ok)" title="Last run succeeded"><svg><use href="#i-check" /></svg></span>
{:else}
  <span class="g" style="color: var(--ink-3)" title="Not run yet"><span class="dot" style="background: var(--line-strong)"></span></span>
{/if}
