<script lang="ts">
  import type { Service } from '../types';
  import { config } from '../stores/config';
  import * as api from '../api';

  interface Props {
    service: Service;
  }

  let { service }: Props = $props();

  let logs = $state('');
  let logsLoading = $state(true);
  let noteValue = $state('');
  let noteSaved = $state(false);
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    noteValue = $config.notes[service.name] || '';
  });

  $effect(() => {
    loadLogs();
  });

  async function loadLogs() {
    logsLoading = true;
    try {
      logs = await api.getLogs(service.name);
    } catch {
      logs = '(failed to load logs)';
    } finally {
      logsLoading = false;
    }
  }

  function handleNoteInput() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      const val = noteValue.trim();
      await api.setNote(service.name, val || null);
      config.update(c => {
        const notes = { ...c.notes };
        if (val) notes[service.name] = val;
        else delete notes[service.name];
        return { ...c, notes };
      });
      noteSaved = true;
      setTimeout(() => noteSaved = false, 1500);
    }, 600);
  }
</script>

<div class="detail-inner">
  <div class="detail-grid">
    <div class="detail-kv">
      <span class="detail-k">Backend</span>
      <span class="detail-v">{service.backend}</span>
    </div>
    <div class="detail-kv">
      <span class="detail-k">Status</span>
      <span class="detail-v">{service.status}</span>
    </div>
    {#if service.pid}
      <div class="detail-kv">
        <span class="detail-k">PID</span>
        <span class="detail-v">{service.pid}</span>
      </div>
    {/if}
    {#if service.enabled !== undefined}
      <div class="detail-kv">
        <span class="detail-k">Enabled</span>
        <span class="detail-v">{service.enabled ? 'Yes' : 'No'}</span>
      </div>
    {/if}
    {#if service.configPath}
      <div class="detail-kv">
        <span class="detail-k">Config</span>
        <span class="detail-v">{service.configPath}</span>
      </div>
    {/if}
    {#if service.command}
      <div class="detail-kv">
        <span class="detail-k">Command</span>
        <span class="detail-v">{service.command}</span>
      </div>
    {/if}
    {#if service.cwd}
      <div class="detail-kv">
        <span class="detail-k">CWD</span>
        <span class="detail-v">{service.cwd}</span>
      </div>
    {/if}
    {#if service.schedule}
      <div class="detail-kv">
        <span class="detail-k">Schedule</span>
        <span class="detail-v">{service.schedule}</span>
      </div>
    {/if}
    {#if service.exitCode !== undefined}
      <div class="detail-kv">
        <span class="detail-k">Exit Code</span>
        <span class="detail-v">{service.exitCode}</span>
      </div>
    {/if}
    {#if service.restartCount !== undefined}
      <div class="detail-kv">
        <span class="detail-k">Restarts</span>
        <span class="detail-v">{service.restartCount}</span>
      </div>
    {/if}
  </div>

  <div class="log-viewer">
    <div class="log-label">Recent Logs</div>
    <pre class="log-content">{#if logsLoading}Loading...{:else}{logs || '(no logs available)'}{/if}</pre>
  </div>

  <div class="notes-section">
    <div class="notes-header">
      <span class="log-label">Notes</span>
      <span class="notes-saved" class:show={noteSaved}>Saved</span>
    </div>
    <textarea
      class="notes-textarea"
      placeholder="Add notes about this service..."
      bind:value={noteValue}
      oninput={handleNoteInput}
      onclick={(e) => e.stopPropagation()}
    ></textarea>
  </div>
</div>

<style>
  .detail-inner { padding: 16px 20px 16px 22px; }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 32px;
    font-size: 11px;
  }

  .detail-kv { display: flex; gap: 8px; }

  .detail-k {
    color: var(--text-muted);
    min-width: 72px;
    flex-shrink: 0;
  }

  .detail-v {
    color: var(--text-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .log-viewer {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border-subtle);
  }

  .log-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .log-content {
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    padding: 10px 12px;
    font-size: 10px;
    line-height: 1.6;
    color: var(--text-dim);
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-all;
    font-family: 'JetBrains Mono', monospace;
    margin: 0;
  }

  .notes-section {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border-subtle);
  }

  .notes-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .notes-textarea {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    padding: 10px 12px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    line-height: 1.6;
    color: var(--text);
    resize: vertical;
    min-height: 56px;
    outline: none;
    transition: border-color 0.15s;
  }

  .notes-textarea::placeholder { color: var(--text-muted); }
  .notes-textarea:focus { border-color: var(--text-dim); outline: none; }

  .notes-saved {
    font-size: 10px;
    color: var(--green);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .notes-saved.show { opacity: 1; }
</style>
