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
      <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l2 3h3l-2.5 3L12 11H8l-4 0 1.5-4L3 4h3z"/></svg>
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
