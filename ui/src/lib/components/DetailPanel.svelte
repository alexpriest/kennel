<script lang="ts">
  import { store } from '../store.svelte';
  import { ui } from '../ui.svelte';
  import { digs } from '../digs.svelte';
  import { statusText, KIND_LABELS, dur, when, type Job } from '../model';
  import Glyph from './Glyph.svelte';
  import Tag from './Tag.svelte';

  const job = $derived(store.byId(ui.open));
  const problem = $derived(job ? store.problem(job) : null);
  const home = (p: string | null | undefined) => (p ?? '').replace(/^\/Users\/[^/]+/, '~');

  let lines = $state<{ stream: string; text: string }[]>([]);
  let logEl = $state<HTMLPreElement>();
  let streaming = $state(false);

  // Follow the open job's merged log while the panel is open.
  $effect(() => {
    const id = ui.open;
    lines = [];
    if (!id) return;
    const source = new EventSource(`/api/jobs/${encodeURIComponent(id)}/logs/stream`);
    source.addEventListener('lines', e => {
      lines = [...lines, ...JSON.parse((e as MessageEvent).data)].slice(-50);
      streaming = true;
      queueMicrotask(() => { if (logEl) logEl.scrollTop = logEl.scrollHeight; });
    });
    source.onerror = () => { streaming = false; };
    return () => { source.close(); streaming = false; };
  });

  function close() {
    location.hash = `#${ui.view}`;
  }

  async function act(j: Job, action: 'start' | 'stop' | 'restart', doing: string) {
    digs.react('alert', null, 1500);
    await store.act(j, action, doing);
  }

  let editing = $state(false);
  let draftName = $state('');
  let draftPurpose = $state('');
  let nameInput = $state<HTMLInputElement>();
  let purposeInput = $state<HTMLTextAreaElement>();
  let saving = $state(false);

  $effect(() => { void ui.open; editing = false; });

  function edit(focus: 'name' | 'purpose' = 'name') {
    if (!job) return;
    draftName = job.name;
    draftPurpose = job.purpose ?? '';
    editing = true;
    queueMicrotask(() => {
      const el = focus === 'name' ? nameInput : purposeInput;
      el?.focus();
      el?.select();
    });
  }

  async function save() {
    if (!job || saving) return;
    const meta: { name?: string; purpose?: string } = {};
    if (draftName.trim() !== job.name) meta.name = draftName.trim();
    if (draftPurpose.trim() !== (job.purpose ?? '')) meta.purpose = draftPurpose.trim();
    if (!Object.keys(meta).length) { editing = false; return; }
    saving = true;
    if (await store.saveMeta(job, meta)) editing = false;
    saving = false;
  }

  function editKeys(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); editing = false; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void save(); }
  }

  function windowKeys(e: KeyboardEvent) {
    const active = document.activeElement as HTMLElement | null;
    if (!job || editing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
    if (e.key === 'e') { e.preventDefault(); edit(); }
  }

  function fix(j: Job) {
    digs.react('alert', 'On it', 1800);
    void store.askClaude(j);
  }

  const recent = $derived.by(() => {
    const rec = (job?.scheduled?.recent ?? []).slice(-14);
    return [...Array(14 - rec.length).fill(''), ...rec];
  });
  const uptime = $derived(job?.daemon?.startedAt ? dur((store.now.getTime() - Date.parse(job.daemon.startedAt)) / 1000) : '');
  const sourceLabel: Record<string, string> = { 'kennel-run': 'kennel-run', run_task: 'run_task.py', launchd: 'launchd exit code only' };
</script>

<svelte:window onkeydown={windowKeys} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="scrim" class:open={!!job} onclick={close}></div>
<aside class="panel" class:open={!!job} aria-label="Job details" aria-hidden={!job}>
  {#if job}
    {@const s = job.scheduled}
    {@const busy = store.pending[job.id]}
    <div class="p-wrap">
      <div class="p-top">
        <div class="p-title">
          {#if editing}
            <input class="p-edit-name" bind:this={nameInput} bind:value={draftName} onkeydown={editKeys} placeholder={job.id} aria-label="Name" />
          {:else}
            <h2><button class="p-editable" type="button" title="Rename (e)" onclick={() => edit('name')}>{job.name}</button></h2>
          {/if}
          <div class="p-sub"><Glyph {job} /><span>{statusText(job)}</span>·<span>{job.own ? KIND_LABELS[job.kind] : 'Third-party'}</span>{#if job.own}·<Tag domain={job.domain} />{/if}</div>
        </div>
        <button class="p-close" type="button" aria-label="Close" onclick={close}><svg class="i"><use href="#i-x" /></svg></button>
      </div>
      {#if editing}
        <div class="p-edit">
          <textarea class="p-edit-purpose" rows="3" bind:this={purposeInput} bind:value={draftPurpose} onkeydown={editKeys} placeholder="What this job does, in one line" aria-label="Description"></textarea>
          <div class="p-edit-row">
            <button class="btn primary" type="button" disabled={saving} onclick={save}>{saving ? 'Saving…' : 'Save'}</button>
            <button class="btn quiet" type="button" onclick={() => (editing = false)}>Cancel</button>
            <small>{job.backend === 'launchd' && job.own ? 'Description saves to the system inventory notes.' : 'Saved in Kennel.'} A blank name goes back to the default.</small>
          </div>
        </div>
      {:else}
        <button class="p-purpose p-editable" class:p-empty={!job.purpose} type="button" title="Edit description (e)" onclick={() => edit('purpose')}>{job.purpose || 'Add a description'}</button>
      {/if}
      {#if problem}<p class="p-purpose" style="color: var(--attn)">{problem.text}</p>{/if}

      <div class="p-actions">
        {#if problem}<button class="btn primary" type="button" onclick={() => fix(job)}>Ask Claude to fix</button>{/if}
        {#if busy}
          <button class="btn" type="button" disabled>{busy}…</button>
        {:else if job.kind === 'daemon'}
          {#if job.daemon?.state === 'down'}
            <button class="btn" type="button" onclick={() => act(job, 'start', 'Starting')}>Start</button>
          {:else}
            <button class="btn" type="button" onclick={() => act(job, 'restart', 'Restarting')}>Restart</button>
            <button class="btn danger" type="button" onclick={() => act(job, 'stop', 'Stopping')}>Stop</button>
          {/if}
        {:else if s?.schedule === 'paused'}
          <button class="btn" type="button" onclick={() => act(job, 'start', 'Resuming')}>Resume schedule</button>
        {:else}
          <button class="btn" type="button" disabled={s?.last === 'running'} onclick={() => act(job, 'start', 'Starting')}>{s?.last === 'running' ? 'Running now' : 'Run now'}</button>
          <button class="btn" type="button" onclick={() => act(job, 'stop', 'Pausing')}>Pause schedule</button>
        {/if}
        {#if s?.docUrl}<a class="btn quiet" href={s.docUrl}>Task doc</a>{/if}
        {#if problem}<button class="btn quiet" type="button" onclick={() => store.mute(job.id)}>Mute</button>{/if}
      </div>

      <dl class="facts">
        {#if uptime}<dt>Uptime</dt><dd>{uptime}</dd>{/if}
        {#if job.daemon?.memoryMb != null}<dt>Memory</dt><dd>{job.daemon.memoryMb} MB{(job.daemon.processes ?? 0) > 1 ? ` across ${job.daemon.processes} processes` : ''}</dd>{/if}
        {#if (job.daemon?.restartsInWindow ?? 0) > 0}<dt>Restarts</dt><dd>{job.daemon?.restartsInWindow} in the last 10 minutes</dd>{/if}
        {#if job.schedule}<dt>Schedule</dt><dd>{job.schedule}</dd>{/if}
        {#if s?.nextRun}<dt>Next run</dt><dd>{when(s.nextRun, store.now)}</dd>{/if}
        {#if s?.lastRun}<dt>Last run</dt><dd>{when(s.lastRun.startedAt, store.now)}{s.lastRun.durationS != null ? `, took ${dur(s.lastRun.durationS)}` : ''}</dd>{/if}
        {#if s?.lastRun?.exitCode != null}<dt>Last exit code</dt><dd>{s.lastRun.exitCode}</dd>
        {:else if job.daemon?.lastExit != null}<dt>Last exit code</dt><dd>{job.daemon.lastExit}</dd>{/if}
        {#if job.pid}<dt>Process</dt><dd class="mono">pid {job.pid}</dd>{/if}
        <dt>Launch label</dt><dd class="mono">{job.id}</dd>
        {#if job.logPaths.stdout}<dt>Log</dt><dd class="mono">{home(job.logPaths.stdout)}</dd>{/if}
        {#if job.logPaths.stderr && job.logPaths.stderr !== job.logPaths.stdout}<dt>Error log</dt><dd class="mono">{home(job.logPaths.stderr)}</dd>{/if}
        {#if s}<dt>Run history</dt><dd>{sourceLabel[s.source]}</dd>{/if}
      </dl>

      {#if s}
        {@const count = recent.filter(Boolean).length}
        <section>
          <div class="p-h">Recent runs <small>{count ? `${count} recorded` : 'none recorded yet'}</small></div>
          <div class="runs">{#each recent as r}<i class:done={r === 'ok'} class:fail={r === 'failed'}></i>{/each}</div>
        </section>
      {/if}

      <section>
        <div class="p-h">Log <small>{streaming ? 'live, output and errors merged' : 'last 50 lines'}</small></div>
        <pre class="log" bind:this={logEl}>{#each lines as l}<span class:err={l.stream === 'err'}>{l.text}</span>{'\n'}{:else}<span class="empty">{job.logPaths.stdout || job.logPaths.stderr ? 'No output yet.' : 'This job has no log file configured.'}</span>{/each}</pre>
      </section>
    </div>
  {/if}
</aside>
