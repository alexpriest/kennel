<script lang="ts">
  import { scheduledTasks, scheduledLoading } from '../stores/scheduled';

  function when(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(/,/g, '');
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, '').toLowerCase();
    return `${day} ${time}`;
  }

  function duration(s: number | null): string {
    if (s === null) return '—';
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
  }

  function cost(usd: number | null): string {
    return usd === null ? '—' : `$${usd.toFixed(2)}`;
  }

  let failedCount = $derived($scheduledTasks.filter(t => t.status === 'failed').length);
  let runningCount = $derived($scheduledTasks.filter(t => t.status === 'running').length);
</script>

<section class="scheduled-panel">
  <div class="panel-header">
    <span class="panel-title">scheduled</span>
    {#if $scheduledLoading}
      <span class="badge muted">loading...</span>
    {:else if failedCount > 0}
      <span class="badge failed">{failedCount} failed</span>
    {:else if runningCount > 0}
      <span class="badge running">{runningCount} running</span>
    {:else}
      <span class="badge ok">{$scheduledTasks.length} task{$scheduledTasks.length === 1 ? '' : 's'}</span>
    {/if}
  </div>

  {#if !$scheduledLoading && $scheduledTasks.length === 0}
    <div class="empty">No scheduled tasks found in ~/Library/LaunchAgents.</div>
  {:else if $scheduledTasks.length > 0}
    <table class="scheduled-table">
      <colgroup>
        <col class="col-indicator" />
        <col class="col-name" />
        <col class="col-schedule" />
        <col class="col-when" />
        <col class="col-when" />
        <col class="col-status" />
        <col class="col-num" />
        <col class="col-num" />
        <col class="col-recent" />
      </colgroup>
      <thead>
        <tr>
          <th></th>
          <th>Task</th>
          <th>Schedule</th>
          <th>Next run</th>
          <th>Last run</th>
          <th>Status</th>
          <th>Time</th>
          <th>Cost</th>
          <th>Last 7</th>
        </tr>
      </thead>
      <tbody>
        {#each $scheduledTasks as task (task.label)}
          <tr class="task-row {task.status === 'never run' ? 'never' : task.status}">
            <td class="td-indicator"><span class="stripe"></span></td>
            <td class="td-name">
              {#if task.docUrl}
                <a href={task.docUrl} title="Open task doc in Obsidian">{task.name}</a>
              {:else}
                {task.name}
              {/if}
              <div class="task-id">{task.label}</div>
            </td>
            <td>{task.schedule}</td>
            <td>{when(task.nextRun)}</td>
            <td>{when(task.lastRunStart)}</td>
            <td class="td-status">
              <span class="status-dot"></span>{task.status}
            </td>
            <td>{duration(task.durationS)}</td>
            <td>{cost(task.costUsd)}</td>
            <td class="td-recent">
              {#each task.recent as run}
                <span class="pip {run}" title={run}></span>
              {:else}
                <span class="none">—</span>
              {/each}
            </td>
          </tr>
          {#if task.error}
            <tr class="error-row">
              <td></td>
              <td colspan="8">{task.error}</td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  {/if}
</section>

<style>
  .scheduled-panel {
    margin-top: 24px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .panel-header {
    background: var(--bg-surface);
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-subtle);
  }

  .panel-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-dim);
    font-weight: 500;
  }

  .badge {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 500;
  }

  .badge.ok { background: var(--green-glow); color: var(--green); }
  .badge.failed { background: var(--red-glow); color: var(--red); }
  .badge.running { background: var(--blue-glow); color: var(--cyan); }
  .badge.muted { color: var(--text-muted); }

  .empty {
    text-align: center;
    padding: 32px 24px;
    color: var(--text-muted);
    font-size: 12px;
    background: var(--bg-surface);
  }

  .scheduled-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .col-indicator { width: 3px; }
  .col-schedule { width: 150px; }
  .col-when { width: 130px; }
  .col-status { width: 100px; }
  .col-num { width: 70px; }
  .col-recent { width: 90px; }

  thead th {
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

  thead th:first-child { padding: 0; }

  td {
    padding: 10px 14px;
    font-size: 12px;
    border-bottom: 1px solid var(--border-subtle);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
    color: var(--text-dim);
  }

  .task-row { background: var(--bg-surface); transition: background 0.1s; }
  .task-row:hover { background: var(--bg-hover); }

  .td-indicator { padding: 0; width: 3px; }
  .stripe { display: block; width: 3px; min-height: 44px; height: 100%; }
  .task-row.ok .stripe { background: var(--green); }
  .task-row.failed .stripe { background: var(--red); }
  .task-row.running .stripe { background: var(--cyan); }
  .task-row.never .stripe { background: var(--text-muted); opacity: 0.4; }

  .task-row.failed { background: var(--red-glow); }
  .task-row.failed td { color: var(--red); }
  .task-row.failed:hover { background: var(--bg-hover); }

  .td-name { color: var(--text); font-weight: 500; white-space: normal; }
  .td-name a { color: inherit; text-decoration: none; }
  .td-name a:hover { text-decoration: underline; }
  .task-row.failed .td-name { color: var(--red); }

  .task-id {
    font-size: 10px;
    font-weight: 400;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 1px;
  }

  .status-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
    background: var(--text-muted);
  }

  .task-row.ok .status-dot { background: var(--green); }
  .task-row.failed .status-dot { background: var(--red); }
  .task-row.running .status-dot { background: var(--cyan); animation: pulse 1.2s ease-in-out infinite; }
  .task-row.running .td-status { color: var(--cyan); }

  .td-recent { display: flex; gap: 3px; align-items: center; height: 44px; padding-top: 0; padding-bottom: 0; }
  .pip { width: 7px; height: 7px; border-radius: 2px; background: var(--text-muted); }
  .pip.ok { background: var(--green); }
  .pip.failed { background: var(--red); }
  .pip.running { background: var(--cyan); }
  .none { color: var(--text-muted); }

  .error-row td {
    background: var(--bg);
    color: var(--red);
    font-size: 11px;
    white-space: normal;
    padding-top: 6px;
    padding-bottom: 8px;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
</style>
