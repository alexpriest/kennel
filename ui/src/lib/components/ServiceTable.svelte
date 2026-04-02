<script lang="ts">
  import { filteredServices, loading, sortColumn, sortDirection, toggleSort } from '../stores/services';
  import type { SortColumn } from '../stores/services';
  import ServiceRow from './ServiceRow.svelte';

  function handleSort(col: SortColumn) {
    toggleSort(col);
  }

  function sortIndicator(col: SortColumn): string {
    if ($sortColumn !== col) return '';
    return $sortDirection === 'asc' ? ' ▲' : ' ▼';
  }
</script>

<div class="service-table-wrap">
  {#if $loading}
    <div class="loading">
      <span class="spinner"></span>
      Loading services...
    </div>
  {:else if $filteredServices.length === 0}
    <div class="empty">No services match your filters.</div>
  {:else}
    <table class="service-table">
      <colgroup>
        <col class="col-indicator" />
        <col class="col-name" />
        <col class="col-backend" />
        <col class="col-status" />
        <col class="col-pid" />
        <col class="col-schedule" />
        <col class="col-actions" />
      </colgroup>
      <thead>
        <tr>
          <th></th>
          <th class="sortable" onclick={() => handleSort('name')}>Service{sortIndicator('name')}</th>
          <th class="sortable" onclick={() => handleSort('backend')}>Backend{sortIndicator('backend')}</th>
          <th class="sortable" onclick={() => handleSort('status')}>Status{sortIndicator('status')}</th>
          <th class="sortable" onclick={() => handleSort('pid')}>PID{sortIndicator('pid')}</th>
          <th class="sortable" onclick={() => handleSort('schedule')}>Schedule{sortIndicator('schedule')}</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each $filteredServices as service (`${service.backend}:${service.backendId}`)}
          <ServiceRow {service} />
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .service-table-wrap {
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .service-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .col-indicator { width: 3px; }
  .col-backend { width: 86px; }
  .col-status { width: 100px; }
  .col-pid { width: 70px; }
  .col-schedule { width: 120px; }
  .col-actions { width: 175px; }

  .service-table :global(thead th) {
    background: var(--bg-raised);
    padding: 8px 14px;
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    text-align: left;
    border-bottom: 1px solid var(--border-subtle);
  }

  .service-table :global(thead th:first-child) { padding: 0; width: 3px; }

  .sortable {
    cursor: pointer;
    user-select: none;
    transition: color 0.1s;
  }

  .sortable:hover { color: var(--text-dim); }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: var(--text-muted);
    font-size: 12px;
    gap: 10px;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border);
    border-top-color: var(--text-dim);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .empty {
    text-align: center;
    padding: 48px 24px;
    color: var(--text-muted);
    font-size: 12px;
  }
</style>
