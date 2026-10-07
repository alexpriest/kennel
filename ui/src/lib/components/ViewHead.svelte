<script lang="ts">
  import type { Job } from '../model';
  import { store } from '../store.svelte';
  let { title, blurb, rows, alerts = true }: { title: string; blurb: string; rows: Job[]; alerts?: boolean } = $props();
  const p = $derived(rows.filter(j => store.problem(j)).length);
</script>

<header class="head">
  <h1>{title}</h1>
  <p>{blurb} {rows.length}{alerts ? (p ? `, ${p} need${p === 1 ? 's' : ''} a look.` : ', all healthy.') : '.'}</p>
</header>
