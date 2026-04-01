<script lang="ts">
  import { searchQuery, filterBackend, filterStatus } from '../stores/services';
  import type { FilterBackend, FilterStatus } from '../types';

  const backends: FilterBackend[] = ['all', 'launchd', 'pm2', 'brew', 'cron'];
  const statuses: FilterStatus[] = ['all', 'running', 'stopped', 'error'];

  function setBackend(b: FilterBackend) {
    filterBackend.set($filterBackend === b ? 'all' : b);
  }

  function setStatus(s: FilterStatus) {
    filterStatus.set($filterStatus === s ? 'all' : s);
  }
</script>

<div class="toolbar">
  <input
    class="search-box"
    type="text"
    placeholder="Filter services..."
    bind:value={$searchQuery}
  />
  {#each backends.slice(1) as b}
    <button
      class="filter-btn"
      class:active={$filterBackend === b}
      onclick={() => setBackend(b)}
    >{b}</button>
  {/each}
  <span class="separator"></span>
  {#each statuses.slice(1) as s}
    <button
      class="filter-btn"
      class:active={$filterStatus === s}
      onclick={() => setStatus(s)}
    >{s}</button>
  {/each}
</div>

<style>
  .toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    align-items: center;
  }

  .search-box {
    flex: 1;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    padding: 8px 12px;
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    outline: none;
    transition: border-color 0.15s;
  }

  .search-box::placeholder { color: var(--text-muted); }
  .search-box:focus { border-color: var(--text-dim); }

  .filter-btn {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    padding: 8px 14px;
    color: var(--text-dim);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .filter-btn:hover { border-color: var(--text-dim); color: var(--text); }
  .filter-btn.active { border-color: var(--text-dim); color: var(--text); background: var(--bg-raised); }

  .separator {
    width: 1px;
    height: 20px;
    background: var(--border-subtle);
    flex-shrink: 0;
  }
</style>
