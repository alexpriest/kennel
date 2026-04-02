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

  async function commitRename() {
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
  }

  async function saveRename(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      commitRename();
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
        onblur={commitRename}
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
      <svg viewBox="0 0 248 248" fill="currentColor"><path d="M52.4 162.9L98.8 136.9l.7-2.3-.7-1.3h-2.3l-7.8-.5-26.5-.7-22.9-.9L17 130l-5.6-1.2L6.2 121.9l.5-3.4 4.7-3.2 6.8.6 14.9 1.1 22.4 1.5 16.2.9 24.1 2.5h3.8l.5-1.5-1.3-1-.9-.9-23.2-15.7-25.1-16.5-13.1-9.6-7-4.8-3.6-4.5-1.5-9.9 6.4-7.1 8.6.6 2.2.6 8.8 6.7 18.7 14.5 24.5 18 3.6 2.9 1.4-.9.2-.7-1.6-2.7L83.8 65.3 69.6 40.8l-6.4-10.2-1.6-6 .1-7.2L68 7.5l4-1.3 9.8 1.3 4.1 3.5 6.1 13.9 9.8 21.9L117 76.6l4.5 8.9 2.4 8.1.9 2.5h1.5v-1.4l1.3-16.8 2.3-20.6 2.3-26.5.7-7.4 3.7-9 7.4-4.8 5.7 2.7 4.7 6.7-.6 4.4-2.8 18.2-5.5 28.5-3.6 19.1h2l2.4-2.5 9.7-12.8L173 53.7l7-8 8.4-8.9 5.3-3.3h10.2l7.4 11.1-3.3 11.5-10.5 13.2-8.6 11.2-12.4 16.6-7.7 13.4.7 1.1 1.9-.2 28-6 15.2-2.7 18.1-3.1 8.1 3.8.9 3.9-3.2 7.9-19.3 4.7-22.7 4.6-33.8 7.9-.3.3.4.7 15.2 1.4 6.5.4h15.9l29.7 2.2 7.8 5.1 4.6 6.3-.8 4.8-12 6-16-3.8-37.6-9-12.9-3.2h-1.8v1.1l10.7 10.5 19.7 17.7 24.6 22.9 1.3 5.7-3.2 4.5-3.3-.5-21.6-16.3-8.4-7.3-18.9-15.9h-1.3v1.6l4.3 6.4 23.1 34.6 1.1 10.6-1.6 3.4-6 2.1-6.5-1.2-13.6-19L147.3 182.5 136.1 163.3l-1.4.9-6.7 71.2-3 3.7-7.1 2.7-6-4.5-3.2-7.3 3.2-14.5 3.8-18.9 3.1-15 2.8-18.7 1.7-6.2-.2-.4-1.3.2-14.1 19.3-21.5 29-16.9 18.1-4.1 1.6-7-3.7.6-6.5 4-5.8 23.4-29.8 14.1-18.5 9.1-10.6-.1-1.5-.5-.1-62.3 40.6-11.1 1.4-4.8-4.5.6-7.3 2.3-2.4 18.7-12.9Z"/></svg>
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
