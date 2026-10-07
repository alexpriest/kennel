<script lang="ts">
  import { domainShort } from '../model';
  let { domain }: { domain: string } = $props();
</script>

<span class="tag"><span class="dot" style="background: var(--{domain}, var(--mac))"></span>{domainShort(domain)}</span>
