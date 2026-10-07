<script lang="ts">
  import { digs } from '../digs.svelte';
  import { store } from '../store.svelte';
  import DigsArt from './DigsArt.svelte';

  function click(event: MouseEvent) {
    event.stopPropagation();
    const n = store.problems.length;
    digs.react('alert', n ? `${n} thing${n > 1 ? 's' : ''} need${n > 1 ? '' : 's'} a look` : 'All quiet', 1500);
  }
</script>

<button
  class="digs"
  class:face-right={digs.facing === 'right'}
  class:wag={digs.wagging}
  type="button"
  aria-label="Digs"
  data-pose={digs.pose}
  onclick={click}
><span class="bubble" class:show={!!digs.bubble}>{digs.bubble}</span><span class="zz" aria-hidden="true">z</span><DigsArt /></button>
