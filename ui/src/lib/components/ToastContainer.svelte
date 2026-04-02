<script lang="ts">
  import { toasts } from '../stores/toast';
</script>

<div class="toast-container">
  {#each $toasts as toast, i (toast.id)}
    <div class="toast {toast.type}">
      {toast.message}
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 10000;
    display: flex;
    flex-direction: column-reverse;
    gap: 8px;
    pointer-events: none;
  }

  .toast {
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 16px;
    font-size: 11px;
    color: var(--text-dim);
    animation: fadeSlideIn 0.15s ease-out;
    font-family: 'JetBrains Mono', monospace;
    pointer-events: auto;
  }

  .toast.success { border-color: var(--green-dim); color: var(--green); }
  .toast.error { border-color: var(--red-dim); color: var(--red); }
</style>
