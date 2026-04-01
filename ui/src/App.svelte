<script lang="ts">
  import { onMount } from 'svelte';
  import { refreshServices } from './lib/stores/services';
  import { refreshConfig, initTheme } from './lib/stores/config';
  import Header from './lib/components/Header.svelte';
  import StatsBar from './lib/components/StatsBar.svelte';
  import Toolbar from './lib/components/Toolbar.svelte';
  import ServiceTable from './lib/components/ServiceTable.svelte';
  import DoctorPanel from './lib/components/DoctorPanel.svelte';
  import ToastContainer from './lib/components/ToastContainer.svelte';

  const REFRESH_INTERVAL = 10;
  let countdown = $state(REFRESH_INTERVAL);
  let intervalId: ReturnType<typeof setInterval>;

  async function refresh() {
    await refreshServices();
    countdown = REFRESH_INTERVAL;
  }

  onMount(() => {
    initTheme();
    refresh();
    refreshConfig();

    intervalId = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        refresh();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  });
</script>

<div class="shell">
  <Header onRefresh={refresh} {countdown} />
  <StatsBar />
  <Toolbar />
  <ServiceTable />
  <DoctorPanel />
</div>
<ToastContainer />

<style>
  .shell {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px;
  }
</style>
