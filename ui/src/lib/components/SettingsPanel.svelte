<script lang="ts">
  import { config, terminals } from '../stores/config';
  import * as api from '../api';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  async function selectTerminal(name: string) {
    await api.setTerminal(name);
    config.update(c => ({ ...c, terminal: name }));
  }

  let mounted = $state(false);

  import { onMount } from 'svelte';
  onMount(() => {
    // Delay attaching click-outside so the opening click doesn't immediately close
    requestAnimationFrame(() => { mounted = true; });
  });

  function handleClickOutside(e: MouseEvent) {
    if (!mounted) return;
    const target = e.target as HTMLElement;
    if (!target.closest('.settings-panel') && !target.closest('.settings-anchor')) {
      onClose();
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="settings-panel open" onclick={(e) => e.stopPropagation()}>
  <div class="settings-label">Terminal</div>
  {#each $terminals as term}
    <button
      class="terminal-option"
      class:selected={$config.terminal === term.name}
      onclick={() => selectTerminal(term.name)}
    >
      <span class="terminal-radio"></span>
      {term.name}
    </button>
  {/each}
</div>

<style>
  .settings-panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    min-width: 200px;
    box-shadow: 0 8px 30px var(--shadow-panel);
    z-index: 100;
    padding: 8px 0;
    animation: fadeSlideIn 0.12s ease-out;
  }

  .settings-label {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    padding: 6px 14px 6px;
  }

  .terminal-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 14px;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-dim);
    transition: background 0.1s, color 0.1s;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    font-family: 'JetBrains Mono', monospace;
  }

  .terminal-option:hover { background: var(--bg-hover); color: var(--text); }
  .terminal-option.selected { color: var(--text); }

  .terminal-radio {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border);
    border-radius: 50%;
    flex-shrink: 0;
    transition: all 0.15s;
    position: relative;
  }

  .terminal-option.selected .terminal-radio {
    border-color: var(--green);
  }

  .terminal-option.selected .terminal-radio::after {
    content: '';
    position: absolute;
    top: 2px; left: 2px; right: 2px; bottom: 2px;
    background: var(--green);
    border-radius: 50%;
  }
</style>
