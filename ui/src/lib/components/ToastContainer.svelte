<script lang="ts">
  import { toasts } from '../stores/toast';
</script>

{#each $toasts as toast (toast.id)}
  <div class="toast {toast.type}">
    {toast.message}
  </div>
{/each}

<style>
  .toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 16px;
    font-size: 11px;
    color: var(--text-dim);
    z-index: 1000;
    animation: fadeSlideIn 0.15s ease-out;
    font-family: 'JetBrains Mono', monospace;
  }

  .toast.success { border-color: var(--green-dim); color: var(--green); }
  .toast.error { border-color: var(--red-dim); color: var(--red); }
</style>
