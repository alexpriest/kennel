<script lang="ts">
  import type { Service, KennelConfig } from '../types';
  import { config } from '../stores/config';
  import { showToast } from '../stores/toast';
  import * as api from '../api';
  import ServiceDetail from './ServiceDetail.svelte';
  import ClaudeModal from './ClaudeModal.svelte';

  interface Props {
    service: Service;
  }

  let { service }: Props = $props();

  let expanded = $state(false);
  let renaming = $state(false);
  let renameValue = $state('');
  let claudeModalOpen = $state(false);

  function displayName(svc: Service, cfg: KennelConfig): string {
    return cfg.aliases[svc.name] || svc.name;
  }

  function startRename(e: MouseEvent) {
    e.stopPropagation();
    renameValue = $config.aliases[service.name] || service.name;
    renaming = true;
  }

  async function saveRename(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const val = renameValue.trim();
      const alias = val === service.name ? null : val;
      await api.setAlias(service.name, alias);
      config.update(c => {
        const aliases = { ...c.aliases };
        if (alias) aliases[service.name] = alias;
        else delete aliases[service.name];
        return { ...c, aliases };
      });
      renaming = false;
    } else if (e.key === 'Escape') {
      renaming = false;
    }
  }

  async function doAction(action: 'start' | 'stop' | 'restart', e: MouseEvent) {
    e.stopPropagation();
    try {
      const result = await api.performAction(service.name, action);
      showToast(result.message, result.success ? 'success' : 'error');
    } catch {
      showToast(`Failed to ${action} ${service.name}`, 'error');
    }
  }

  function openClaude(e: MouseEvent) {
    e.stopPropagation();
    claudeModalOpen = true;
  }
</script>

<tr class="svc-row" class:expanded onclick={() => expanded = !expanded}>
  <td class="td-indicator">
    <span class="stripe {service.status}"></span>
  </td>
  <td class="td-name">
    {#if renaming}
      <input
        class="rename-input"
        bind:value={renameValue}
        onkeydown={saveRename}
        onclick={(e) => e.stopPropagation()}
        autofocus
      />
    {:else}
      <div class="name-line">
        {displayName(service, $config)}
        <button class="edit-btn" onclick={startRename} title="Rename">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M8.5 1.5l2 2-7 7H1.5v-2z"/></svg>
        </button>
      </div>
      <div class="service-id">{service.backendId}</div>
    {/if}
  </td>
  <td class="td-backend backend-{service.backend}">{service.backend}</td>
  <td class="td-status">
    <span class="status-dot {service.status}"></span>
    {service.status}
  </td>
  <td class="td-pid">{service.pid ?? '—'}</td>
  <td class="td-schedule">{service.schedule ?? '—'}</td>
  <td class="td-actions">
    {#if service.manageable}
      {#if service.status === 'running'}
        <button class="action-btn stop" onclick={(e) => doAction('stop', e)}>Stop</button>
        <button class="action-btn" onclick={(e) => doAction('restart', e)}>Restart</button>
      {:else}
        <button class="action-btn start" onclick={(e) => doAction('start', e)}>Start</button>
      {/if}
    {/if}
    <button class="claude-btn" onclick={openClaude} title="Investigate with Claude">
      <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l2 3h3l-2.5 3L12 11H8l-4 0 1.5-4L3 4h3z"/></svg>
    </button>
  </td>
</tr>

{#if expanded}
  <tr class="detail-row">
    <td colspan="7" class="detail-td">
      <ServiceDetail {service} />
    </td>
  </tr>
{/if}

{#if claudeModalOpen}
  <ClaudeModal {service} onClose={() => claudeModalOpen = false} />
{/if}

<style>
  .svc-row {
    background: var(--bg-surface);
    cursor: pointer;
    transition: background 0.1s;
  }

  .svc-row:hover { background: var(--bg-hover); }
  .svc-row.expanded { background: var(--bg-raised); }
  .detail-row { cursor: default; background: var(--bg); }

  td {
    padding: 10px 14px;
    font-size: 12px;
    border-bottom: 1px solid var(--border-subtle);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
  }

  .td-indicator {
    padding: 0 !important;
    width: 3px;
  }

  .stripe {
    display: block;
    width: 3px;
    min-height: 44px;
    height: 100%;
  }

  .stripe.running { background: var(--green); }
  .stripe.stopped { background: var(--text-muted); opacity: 0.4; }
  .stripe.error { background: var(--red); }
  .stripe.scheduled { background: var(--blue); }
  .stripe.unknown { background: var(--yellow); }

  .td-name { white-space: normal !important; }

  .name-line {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
    color: var(--text);
    line-height: 1.3;
  }

  .service-id {
    font-size: 10px;
    font-weight: 400;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 1px;
    line-height: 1.3;
  }

  .edit-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 2px;
    opacity: 0;
    transition: opacity 0.15s, color 0.15s;
    flex-shrink: 0;
    display: inline-flex;
  }

  .svc-row:hover .edit-btn { opacity: 0.6; }
  .edit-btn:hover { opacity: 1 !important; color: var(--text); }
  .edit-btn :global(svg) { width: 11px; height: 11px; }

  .rename-input {
    background: var(--bg);
    border: 1px solid var(--text-dim);
    border-radius: 3px;
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    padding: 2px 6px;
    outline: none;
    width: 100%;
  }

  .td-backend {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  :global(.backend-launchd) { color: var(--cyan); }
  :global(.backend-pm2) { color: var(--magenta); }
  :global(.backend-brew) { color: var(--amber); }
  :global(.backend-cron) { color: var(--blue); }

  .td-status { font-size: 11px; }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 6px;
    vertical-align: middle;
  }

  .status-dot.running { background: var(--green); box-shadow: 0 0 6px var(--green); }
  .status-dot.stopped { background: var(--text-muted); }
  .status-dot.error { background: var(--red); box-shadow: 0 0 6px var(--red); }
  .status-dot.scheduled { background: var(--blue); box-shadow: 0 0 6px var(--blue); }
  .status-dot.unknown { background: var(--yellow); }

  .td-pid { color: var(--text-dim); font-size: 11px; }
  .td-schedule { color: var(--text-dim); font-size: 11px; }

  .td-actions {
    white-space: nowrap !important;
    overflow: visible !important;
    text-overflow: clip !important;
  }

  .action-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 3px;
    color: var(--text-dim);
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    padding: 3px 7px;
    cursor: pointer;
    transition: all 0.12s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-right: 4px;
  }

  .action-btn:hover { border-color: var(--text-dim); color: var(--text); }
  .action-btn.stop:hover { border-color: var(--red); color: var(--red); }
  .action-btn.start:hover { border-color: var(--green); color: var(--green); }

  .claude-btn {
    background: none;
    border: none;
    color: var(--claude);
    cursor: pointer;
    padding: 3px;
    display: inline-flex;
    align-items: center;
    opacity: 0.45;
    transition: opacity 0.15s, transform 0.15s;
    vertical-align: middle;
  }

  .claude-btn:hover { opacity: 1; transform: scale(1.2); }
  .claude-btn :global(svg) { width: 13px; height: 13px; }

  .detail-td {
    padding: 0 !important;
    background: var(--bg);
  }
</style>
