<script lang="ts">
  import { store } from '../store.svelte';
  import { ui, VIEWS, jobsFor } from '../ui.svelte';
  import { DOMAIN_LABELS } from '../model';
  import Digs from './Digs.svelte';

  let { searchInput = $bindable() }: { searchInput?: HTMLInputElement } = $props();

  const domains = $derived.by(() => {
    const present = new Set(store.jobs.filter(j => j.own).map(j => j.domain));
    const order = Object.keys(DOMAIN_LABELS);
    return [...present].filter(d => d !== 'mac').sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  });

  function count(id: (typeof VIEWS)[number]['id']): number {
    return id === 'today' ? store.problems.length : jobsFor(id, store.jobs).length;
  }
</script>

<aside class="side" aria-label="Kennel">
  <div class="brand"><div class="brand-name">Kennel</div><div class="brand-sub">{store.host || 'This Mac'}</div></div>
  <label class="search">
    <svg class="i"><use href="#i-search" /></svg>
    <input bind:this={searchInput} bind:value={ui.search} placeholder="Search" aria-label="Search jobs" />
    <span class="kbd">⌘K</span>
  </label>
  <nav class="group" aria-label="Views">
    {#each VIEWS as v}
      <a class="nav" href="#{v.id}" aria-current={ui.view === v.id && !ui.search ? 'page' : undefined}>
        <svg class="i"><use href="#i-{v.icon}" /></svg>
        <span class="label">{v.label}</span>
        <span class="count" class:hot={v.id === 'today' && count(v.id) > 0}>{count(v.id)}</span>
      </a>
    {/each}
  </nav>
  <div class="group" role="group" aria-label="Filter by domain">
    <div class="group-label">Domains {#if ui.domains.length}<button type="button" onclick={() => (ui.domains = [])}>Clear</button>{/if}</div>
    <div class="group">
      {#each domains as d}
        <button class="nav" type="button" aria-pressed={ui.domains.includes(d)} onclick={() => ui.toggleDomain(d)}>
          <span class="dot" style="background: var(--{d}, var(--mac))"></span><span class="label">{DOMAIN_LABELS[d] ?? d}</span>
        </button>
      {/each}
    </div>
  </div>
  <div class="side-foot">
    <Digs />
    <div class="foot-row">
      <span class:offline={!store.live}><span class="live"></span>{store.live ? 'Live' : 'Reconnecting'}</span>
      <button class="hint" type="button" onclick={() => (ui.help = true)}>Shortcuts <span class="kbd">?</span></button>
    </div>
  </div>
</aside>
