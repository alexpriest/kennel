<script lang="ts">
  import { stats } from '../stores/services';
</script>

<div class="stats">
  <div class="stat">
    <span class="stat-value dim">{$stats.total}</span>
    <span class="stat-label">Total</span>
  </div>
  <div class="stat">
    <span class="stat-value green">{$stats.running}</span>
    <span class="stat-label">Running</span>
  </div>
  <div class="stat">
    <span class="stat-value red">{$stats.errored}</span>
    <span class="stat-label">Errored</span>
  </div>
  <div class="stat">
    <span class="stat-value dim">{$stats.stopped}</span>
    <span class="stat-label">Stopped</span>
  </div>
</div>

<style>
  .stats {
    display: flex;
    gap: 2px;
    margin-bottom: 24px;
  }

  .stat {
    flex: 1;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .stat:first-child { border-radius: var(--radius) 0 0 var(--radius); }
  .stat:last-child { border-radius: 0 var(--radius) var(--radius) 0; }

  .stat-value {
    font-size: 22px;
    font-weight: 600;
    font-family: 'Space Grotesk', sans-serif;
  }

  .stat-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
  }

  .stat-value.green { color: var(--green); }
  .stat-value.red { color: var(--red); }
  .stat-value.dim { color: var(--text-dim); }
</style>
