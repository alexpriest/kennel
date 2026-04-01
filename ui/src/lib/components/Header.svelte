<script lang="ts">
  import { theme, toggleTheme } from '../stores/config';
  import SettingsPanel from './SettingsPanel.svelte';

  let settingsOpen = $state(false);
  let refreshing = $state(false);

  interface Props {
    onRefresh: () => Promise<void>;
    countdown: number;
  }

  let { onRefresh, countdown }: Props = $props();

  async function handleRefresh() {
    refreshing = true;
    await onRefresh();
    setTimeout(() => refreshing = false, 600);
  }
</script>

<header>
  <div class="logo">
    kennel<span>where your daemons live</span>
  </div>
  <div class="header-controls">
    <span class="refresh-timer">{countdown}s</span>
    <button class="icon-btn" class:spinning={refreshing} onclick={handleRefresh} title="Refresh">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2.5 8a5.5 5.5 0 0 1 9.3-3.95L14 2v4h-4l2.1-2.1A4 4 0 1 0 12 8"/>
      </svg>
    </button>
    <button class="icon-btn" onclick={toggleTheme} title="Toggle theme">
      {#if $theme === 'dark'}
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="3"/><path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7"/></svg>
      {:else}
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13.5 9.2A5.5 5.5 0 1 1 6.8 2.5a4.5 4.5 0 0 0 6.7 6.7Z"/></svg>
      {/if}
    </button>
    <div class="settings-anchor">
      <button class="icon-btn" onclick={() => settingsOpen = !settingsOpen} title="Settings">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4 13 3"/></svg>
      </button>
      {#if settingsOpen}
        <SettingsPanel onClose={() => settingsOpen = false} />
      {/if}
    </div>
  </div>
</header>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }

  .logo {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: var(--text);
  }

  .logo span {
    color: var(--text-muted);
    font-weight: 400;
    font-size: 14px;
    margin-left: 12px;
    letter-spacing: 0.5px;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .refresh-timer {
    font-size: 11px;
    color: var(--text-muted);
    margin-right: 8px;
  }

  .icon-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    width: 32px;
    height: 32px;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
    position: relative;
    flex-shrink: 0;
  }

  .icon-btn:hover { background: var(--bg-hover); color: var(--text); }
  .icon-btn :global(svg) { width: 15px; height: 15px; }
  .icon-btn.spinning :global(svg) { animation: spin 0.6s ease; }

  .settings-anchor { position: relative; }
</style>
