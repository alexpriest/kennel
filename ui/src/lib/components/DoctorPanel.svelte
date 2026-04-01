<script lang="ts">
  import { doctorIssues, doctorLoading, refreshDoctor } from '../stores/doctor';

  let open = $state(false);
  let loaded = $state(false);

  async function toggle() {
    open = !open;
    if (open && !loaded) {
      await refreshDoctor();
      loaded = true;
    }
  }
</script>

<div class="doctor-panel">
  <button class="doctor-header" onclick={toggle}>
    <span class="doctor-title">Doctor</span>
    {#if $doctorLoading}
      <span class="doctor-badge issues">checking...</span>
    {:else if loaded}
      {#if $doctorIssues.length === 0}
        <span class="doctor-badge clean">All clear</span>
      {:else}
        <span class="doctor-badge issues">{$doctorIssues.length} issue{$doctorIssues.length === 1 ? '' : 's'}</span>
      {/if}
    {/if}
  </button>
  {#if open}
    <div class="doctor-results">
      {#if $doctorIssues.length === 0 && loaded && !$doctorLoading}
        <div class="doctor-clean">No issues found.</div>
      {/if}
      {#each $doctorIssues as issue}
        <div class="doctor-issue">
          <span class="issue-icon {issue.severity}">
            {#if issue.severity === 'error'}!
            {:else if issue.severity === 'warning'}?
            {:else}i{/if}
          </span>
          <div class="issue-body">
            <div class="issue-service">{issue.service}</div>
            <div class="issue-message">{issue.message}</div>
            {#if issue.suggestion}
              <div class="issue-suggestion">{issue.suggestion}</div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .doctor-panel {
    margin-top: 24px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .doctor-header {
    background: var(--bg-surface);
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: background 0.1s;
    width: 100%;
    border: none;
    font-family: 'JetBrains Mono', monospace;
  }

  .doctor-header:hover { background: var(--bg-hover); }

  .doctor-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-dim);
    font-weight: 500;
  }

  .doctor-badge {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 500;
  }

  .doctor-badge.clean { background: var(--green-glow); color: var(--green); }
  .doctor-badge.issues { background: var(--yellow-glow); color: var(--yellow); }

  .doctor-results {
    border-top: 1px solid var(--border-subtle);
  }

  .doctor-clean {
    padding: 16px;
    text-align: center;
    color: var(--text-muted);
    font-size: 12px;
  }

  .doctor-issue {
    padding: 10px 16px;
    border-top: 1px solid var(--border-subtle);
    font-size: 11px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .doctor-issue:first-child { border-top: none; }

  .issue-icon {
    flex-shrink: 0;
    width: 14px;
    text-align: center;
    margin-top: 1px;
    font-weight: 700;
  }

  .issue-icon.error { color: var(--red); }
  .issue-icon.warning { color: var(--yellow); }
  .issue-icon.info { color: var(--blue); }

  .issue-body { flex: 1; }
  .issue-service { color: var(--text); font-weight: 500; }
  .issue-message { color: var(--text-dim); margin-top: 2px; }

  .issue-suggestion {
    color: var(--text-muted);
    margin-top: 3px;
    font-size: 10px;
  }
</style>
