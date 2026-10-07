<script lang="ts">
  import { onMount } from 'svelte';
  import { store } from './lib/store.svelte';
  import { ui, VIEWS, type ViewId } from './lib/ui.svelte';
  import { digs } from './lib/digs.svelte';
  import { applySaved, toggleTheme, nextFont, nextSize } from './lib/prefs';
  import Sprite from './lib/components/Sprite.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import Today from './lib/components/Today.svelte';
  import Daemons from './lib/components/Daemons.svelte';
  import Scheduled from './lib/components/Scheduled.svelte';
  import Agents from './lib/components/Agents.svelte';
  import Hidden from './lib/components/Hidden.svelte';
  import SearchResults from './lib/components/SearchResults.svelte';
  import DetailPanel from './lib/components/DetailPanel.svelte';
  import Help from './lib/components/Help.svelte';
  import Toast from './lib/components/Toast.svelte';

  let searchInput = $state<HTMLInputElement>();
  let sel = -1;

  function route() {
    const id = (location.hash || '#today').slice(1);
    if (id.startsWith('job/')) {
      ui.open = decodeURIComponent(id.slice(4));
      return;
    }
    ui.open = null;
    ui.view = (VIEWS.some(v => v.id === id) ? id : 'today') as ViewId;
    ui.search = '';
    sel = -1;
  }

  // Digs faces the panel while it is open and settles when it closes.
  $effect(() => {
    const job = store.byId(ui.open);
    if (job) digs.lookAt(!!store.problem(job));
    else digs.lookAway(store.problems.length);
  });
  $effect(() => { digs.rest(store.problems.length, !!ui.open); });

  function rows(): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>('.main .vt-row, .main .tile, .main .card')];
  }

  function openRow(el: HTMLElement | undefined) {
    if (!el) return;
    const href = el.getAttribute('href') ?? `#job/${encodeURIComponent(el.dataset.open ?? '')}`;
    location.hash = href;
  }

  function keydown(e: KeyboardEvent) {
    digs.wake(store.problems.length, !!ui.open);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput?.focus();
      searchInput?.select();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const active = document.activeElement as HTMLElement | null;
    if (active === searchInput) {
      if (e.key === 'Escape') { ui.search = ''; searchInput?.blur(); }
      if (e.key === 'Enter') openRow(rows()[0]);
      return;
    }
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
    if (e.key === 'Escape') {
      if (ui.help) ui.help = false;
      else if (ui.open) location.hash = `#${ui.view}`;
      else if (ui.search) ui.search = '';
      return;
    }
    if (e.key === '?') { ui.help = !ui.help; return; }
    if (e.key === 'd') { store.say(toggleTheme()); return; }
    if (e.key === 'f') { store.say(nextSize()); return; }
    if (e.key === 't') { store.say(nextFont()); return; }
    if (/^[1-5]$/.test(e.key)) { location.hash = `#${VIEWS[Number(e.key) - 1].id}`; return; }
    const list = rows();
    if ((e.key === 'j' || e.key === 'k') && list.length) {
      sel = Math.max(0, Math.min(list.length - 1, sel + (e.key === 'j' ? 1 : -1)));
      list.forEach((r, i) => r.setAttribute('aria-selected', String(i === sel)));
      list[sel].scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Enter' && sel >= 0) openRow(list[sel]);
  }

  function pointerover(e: PointerEvent) {
    const target = (e.target as HTMLElement).closest?.('[data-problem]');
    digs.hoverProblem(!!target, store.problems.length, !!ui.open);
  }

  onMount(() => {
    applySaved();
    store.connect();
    route();
    digs.wake(store.problems.length, false);
    const wake = () => digs.wake(store.problems.length, !!ui.open);
    addEventListener('pointermove', wake, { passive: true });
    addEventListener('scroll', wake, { passive: true });
    return () => { removeEventListener('pointermove', wake); removeEventListener('scroll', wake); };
  });
</script>

<svelte:window onhashchange={route} onkeydown={keydown} onpointerover={pointerover} />

<Sprite />
<div class="app">
  <Sidebar bind:searchInput />
  <main class="main">
    <div class="wrap">
      {#if !store.loaded}
        <p class="empty-view">Loading jobs…</p>
      {:else if ui.search.trim()}
        <SearchResults />
      {:else if ui.view === 'daemons'}<Daemons />
      {:else if ui.view === 'scheduled'}<Scheduled />
      {:else if ui.view === 'agents'}<Agents />
      {:else if ui.view === 'hidden'}<Hidden />
      {:else}<Today />{/if}
    </div>
  </main>
</div>
<DetailPanel />
<Help bind:open={ui.help} />
<Toast />
