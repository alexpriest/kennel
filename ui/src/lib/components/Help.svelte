<script lang="ts">
  let { open = $bindable(false) }: { open: boolean } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="help-backdrop" class:open role="dialog" aria-modal="true" aria-labelledby="help-title" tabindex="-1" onclick={e => { if (e.target === e.currentTarget) open = false; }}>
  <div class="help">
    <h3 id="help-title">Keyboard shortcuts</h3>
    <dl>
      <dt><span class="kbd">⌘K</span></dt><dd>Search jobs</dd>
      <dt><span class="kbd">1</span>–<span class="kbd">5</span></dt><dd>Today, Daemons, Scheduled, Agents, Mac and third-party</dd>
      <dt><span class="kbd">j</span> <span class="kbd">k</span></dt><dd>Move through a list</dd>
      <dt><span class="kbd">↵</span></dt><dd>Open the selected job</dd>
      <dt><span class="kbd">e</span></dt><dd>Rename or describe the open job</dd>
      <dt><span class="kbd">d</span></dt><dd>Dark or light mode</dd>
      <dt><span class="kbd">f</span></dt><dd>Text size</dd>
      <dt><span class="kbd">t</span></dt><dd>Next typeface</dd>
      <dt><span class="kbd">?</span></dt><dd>This list</dd>
      <dt><span class="kbd">esc</span></dt><dd>Close</dd>
    </dl>
  </div>
</div>
