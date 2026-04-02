<script lang="ts">
  import type { Service } from '../types';
  import { showToast } from '../stores/toast';
  import * as api from '../api';

  interface Props {
    service: Service;
    onClose: () => void;
  }

  let { service, onClose }: Props = $props();

  let launching = $state(false);

  function buildPrompt(svc: Service): string {
    const parts = [`Investigate the "${svc.name}" service (${svc.backend} backend).`];
    parts.push(`Status: ${svc.status}`);
    if (svc.pid) parts.push(`PID: ${svc.pid}`);
    if (svc.configPath) parts.push(`Config: ${svc.configPath}`);
    if (svc.logPaths?.stdout) parts.push(`Stdout log: ${svc.logPaths.stdout}`);
    if (svc.logPaths?.stderr) parts.push(`Stderr log: ${svc.logPaths.stderr}`);
    if (svc.command) parts.push(`Command: ${svc.command}`);
    parts.push('Check logs, config, and process health. Report anything notable.');
    return parts.join('\n');
  }

  let prompt = $derived(buildPrompt(service));

  async function launch() {
    launching = true;
    try {
      const result = await api.launchClaude(prompt);
      if (result.success) {
        showToast('Claude session launched', 'success');
        onClose();
      } else {
        showToast(result.message || 'Failed to launch', 'error');
      }
    } catch {
      showToast('Failed to launch Claude', 'error');
    } finally {
      launching = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="modal-overlay open" onclick={onClose}>
  <div class="modal" onclick={(e) => e.stopPropagation()}>
    <div class="modal-header">
      <svg viewBox="0 0 248 248" fill="currentColor"><path d="M52.4 162.9L98.8 136.9l.7-2.3-.7-1.3h-2.3l-7.8-.5-26.5-.7-22.9-.9L17 130l-5.6-1.2L6.2 121.9l.5-3.4 4.7-3.2 6.8.6 14.9 1.1 22.4 1.5 16.2.9 24.1 2.5h3.8l.5-1.5-1.3-1-.9-.9-23.2-15.7-25.1-16.5-13.1-9.6-7-4.8-3.6-4.5-1.5-9.9 6.4-7.1 8.6.6 2.2.6 8.8 6.7 18.7 14.5 24.5 18 3.6 2.9 1.4-.9.2-.7-1.6-2.7L83.8 65.3 69.6 40.8l-6.4-10.2-1.6-6 .1-7.2L68 7.5l4-1.3 9.8 1.3 4.1 3.5 6.1 13.9 9.8 21.9L117 76.6l4.5 8.9 2.4 8.1.9 2.5h1.5v-1.4l1.3-16.8 2.3-20.6 2.3-26.5.7-7.4 3.7-9 7.4-4.8 5.7 2.7 4.7 6.7-.6 4.4-2.8 18.2-5.5 28.5-3.6 19.1h2l2.4-2.5 9.7-12.8L173 53.7l7-8 8.4-8.9 5.3-3.3h10.2l7.4 11.1-3.3 11.5-10.5 13.2-8.6 11.2-12.4 16.6-7.7 13.4.7 1.1 1.9-.2 28-6 15.2-2.7 18.1-3.1 8.1 3.8.9 3.9-3.2 7.9-19.3 4.7-22.7 4.6-33.8 7.9-.3.3.4.7 15.2 1.4 6.5.4h15.9l29.7 2.2 7.8 5.1 4.6 6.3-.8 4.8-12 6-16-3.8-37.6-9-12.9-3.2h-1.8v1.1l10.7 10.5 19.7 17.7 24.6 22.9 1.3 5.7-3.2 4.5-3.3-.5-21.6-16.3-8.4-7.3-18.9-15.9h-1.3v1.6l4.3 6.4 23.1 34.6 1.1 10.6-1.6 3.4-6 2.1-6.5-1.2-13.6-19L147.3 182.5 136.1 163.3l-1.4.9-6.7 71.2-3 3.7-7.1 2.7-6-4.5-3.2-7.3 3.2-14.5 3.8-18.9 3.1-15 2.8-18.7 1.7-6.2-.2-.4-1.3.2-14.1 19.3-21.5 29-16.9 18.1-4.1 1.6-7-3.7.6-6.5 4-5.8 23.4-29.8 14.1-18.5 9.1-10.6-.1-1.5-.5-.1-62.3 40.6-11.1 1.4-4.8-4.5.6-7.3 2.3-2.4 18.7-12.9Z"/></svg>
      <span class="modal-title">Investigate with Claude</span>
    </div>
    <div class="modal-body">
      <div class="modal-label">Prompt</div>
      <pre class="modal-prompt">{prompt}</pre>
    </div>
    <div class="modal-footer">
      <button class="modal-cancel" onclick={onClose}>Cancel</button>
      <button class="modal-launch" onclick={launch} disabled={launching}>
        {launching ? 'Launching...' : 'Launch'}
      </button>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6);
    z-index: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.12s ease-out;
  }

  .modal {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    width: 560px;
    max-width: 90vw;
    max-height: 80vh;
    box-shadow: 0 16px 48px var(--shadow-panel);
    animation: fadeSlideIn 0.15s ease-out;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 20px 12px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .modal-header :global(svg) { width: 18px; height: 18px; color: var(--claude); flex-shrink: 0; }

  .modal-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
  }

  .modal-body {
    padding: 16px 20px;
    flex: 1;
    overflow-y: auto;
  }

  .modal-label {
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .modal-prompt {
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    padding: 12px 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    line-height: 1.6;
    color: var(--text-dim);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 200px;
    overflow-y: auto;
    margin: 0;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px 16px;
    border-top: 1px solid var(--border-subtle);
  }

  .modal-cancel {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    padding: 6px 14px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .modal-cancel:hover { border-color: var(--text-dim); color: var(--text); }

  .modal-launch {
    background: var(--claude-glow);
    border: 1px solid var(--claude);
    border-radius: var(--radius);
    color: var(--claude);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    padding: 6px 14px;
    cursor: pointer;
    transition: all 0.15s;
    font-weight: 500;
  }

  .modal-launch:hover { background: var(--claude); color: var(--bg); }
  .modal-launch:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
