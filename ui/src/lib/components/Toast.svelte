<script lang="ts">
  import { store } from '../store.svelte';
  let visible = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    if (!store.toast) return;
    visible = true;
    clearTimeout(timer);
    timer = setTimeout(() => { visible = false; }, 2200);
  });
</script>

<div class="toast" class:show={visible} role="status" aria-live="polite">{store.toast?.text ?? ''}</div>
