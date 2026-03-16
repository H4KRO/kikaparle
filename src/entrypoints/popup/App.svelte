<script lang="ts">
  type Member = {
    id: string;
    name: string;
  };

  type Team = {
    id: string;
    name: string;
    members: Member[];
  };

  type Participant = {
    id: string;
    name: string;
    isAbsent?: boolean;
    hasSpoken?: boolean;
  };

  type Session = {
    teamId?: string;
    participants: Participant[];
  };

  async function getTeams(): Promise<Team[]> {
    return storage.getItem<Team[]>("local:teams").then((teams) => teams || []);
  }

  async function getTeamById(teamId: string): Promise<Team | undefined> {
    const teams = await getTeams();
    return teams.find((team) => team.id === teamId);
  }

  async function updateTeams(teams: Team[]): Promise<void> {
    return storage.setItem("local:teams", teams);
  }

  async function getSession(): Promise<Session | null> {
    return storage.getItem<Session>("local:session").then(
      (session) =>
        session || {
          teamId: undefined,
          participants: [],
        },
    );
  }

  async function updateSession(session: Session): Promise<void> {
    console.log("Updating session:", session);
    return await storage.setItem("local:session", session);
  }

  let teams: Team[] = [];
  let session: Session | null = null;
  let selectedTeamId: string | undefined = undefined;

  $: if (teams) {
    updateTeams(teams);
  }

  $: if (session) {
    updateSession(session);
  }

  function addParticipant() {
    if (session) {
      session.participants = [
        ...session.participants,
        {
          id: crypto.randomUUID(),
          name: prompt("Enter participant name") || "Unnamed Participant",
        },
      ];
    }
  }

  function clearSession() {
    session = {
      teamId: undefined,
      participants: [],
    };
  }

  function clearTeams() {
    teams = [];
  }

  function saveAsTeams() {
    if (session) {
      const newTeam: Team = {
        id: crypto.randomUUID(),
        name: prompt("Enter team name") || "Unnamed Team",
        members: session.participants.map((participant) => ({
          id: participant.id,
          name: participant.name,
        })),
      };
      teams = [...teams, newTeam];
      session.teamId = newTeam.id;
      selectedTeamId = newTeam.id;
    }
  }

  function updateTeamFromSession() {
    if (!session || !selectedTeamId) return;
    const presentParticipants = session.participants.filter((p) => !p.isAbsent);
    teams = teams.map((team) =>
      team.id === selectedTeamId
        ? {
            ...team,
            members: presentParticipants.map((p) => ({
              id: p.id,
              name: p.name,
            })),
          }
        : team,
    );
  }

  function deleteSelectedTeam() {
    if (!selectedTeamId) return;
    teams = teams.filter((t) => t.id !== selectedTeamId);
    clearSession();
  }

  async function startSession(teamId?: string) {
    clearSession();
    if (!teamId) return;
    const team = await getTeamById(teamId);
    if (team) {
      session = {
        teamId: team.id,
        participants: team.members.map((member) => ({
          id: member.id,
          name: member.name,
        })),
      };
      selectedTeamId = team.id;
    }
  }

  function toggleHasSpoken(participantId: string) {
    if (!session) return;
    session = {
      ...session,
      participants: session.participants.map((p) =>
        p.id === participantId ? { ...p, hasSpoken: !p.hasSpoken } : p,
      ),
    };
  }

  type Theme = "light" | "dark" | "auto";
  let theme: Theme = "auto";
  let themeLoaded = false;

  storage.getItem<Theme>("local:theme").then((saved) => {
    if (saved) theme = saved;
    themeLoaded = true;
  });

  $: if (themeLoaded) void storage.setItem("local:theme", theme);

  Promise.all([getTeams(), getSession()]).then(async ([fetchedTeams, fetchedSession]) => {
    teams = fetchedTeams;
    session = fetchedSession;

    console.log("Initial teams:", teams);
    console.log("Initial session:", session);

    if (!session?.participants.length && teams.length > 0) {
      setTimeout(() => {
        startSession(teams[0].id);
      });
    }
  });

  let showDebug = false;

  const i18n = browser.i18n.getMessage;
</script>

<div class="popup" data-theme={theme}>
  <main class="popup__body">
    <header class="popup__header">
      <h1 class="popup__title">{i18n("appTitle")}</h1>
      <div class="popup__theme-toggle">
        <button
          class="popup__theme-btn"
          class:popup__theme-btn--active={theme === "light"}
          type="button"
          on:click={() => (theme = "light")}>☀</button
        >
        <button
          class="popup__theme-btn"
          class:popup__theme-btn--active={theme === "dark"}
          type="button"
          on:click={() => (theme = "dark")}>☾</button
        >
        <button
          class="popup__theme-btn"
          class:popup__theme-btn--active={theme === "auto"}
          type="button"
          on:click={() => (theme = "auto")}>{i18n("themeAuto")}</button
        >
      </div>
    </header>

    <section class="popup__panel">
      <ul class="popup__list">
        {#each session?.participants || [] as participant}
          <li
            class="popup__list-item"
            class:popup__list-item--spoken={participant.hasSpoken}
            class:popup__list-item--absent={participant.isAbsent}
          >
            <button
              class="popup__speaker-btn"
              type="button"
              title={participant.hasSpoken
                ? i18n("participantHasSpoken")
                : i18n("participantHasNotSpoken")}
              on:click={() => toggleHasSpoken(participant.id)}
            >
              {participant.hasSpoken ? "✓" : "○"}
            </button>
            <span class="popup__participant-name">{participant.name}</span>
            <button
              class="popup__absent-btn"
              type="button"
              title={i18n("participantAbsent")}
              on:click={() => (participant.isAbsent = !participant.isAbsent)}
            >
              {participant.isAbsent ? "↩" : "✕"}
            </button>
          </li>
        {/each}
      </ul>
    </section>
  </main>

  <footer class="popup__footer">
    <select class="popup__select" bind:value={selectedTeamId}>
      <option value={undefined}>{i18n("teamSelectPlaceholder")}</option>
      {#each teams as team}
        <option value={team.id} selected={session?.teamId === team.id}
          >{team.name}</option
        >
      {/each}
    </select>

    <div class="popup__actions">
      <button
        class="popup__btn"
        type="button"
        disabled={!selectedTeamId}
        on:click={() => startSession(selectedTeamId)}
        >{i18n("sessionStart")}</button
      >
      <button
        class="popup__btn popup__btn--danger"
        type="button"
        disabled={!selectedTeamId}
        on:click={deleteSelectedTeam}>{i18n("teamDelete")}</button
      >
      <button class="popup__btn" type="button" on:click={addParticipant}
        >{i18n("participantAdd")}</button
      >
      <button
        class="popup__btn popup__btn--warning"
        type="button"
        on:click={clearSession}>{i18n("sessionReset")}</button
      >
      <button class="popup__btn" type="button" on:click={saveAsTeams}
        >{i18n("teamSave")}</button
      >
      <button
        class="popup__btn popup__btn--teal"
        type="button"
        disabled={!selectedTeamId}
        on:click={updateTeamFromSession}>{i18n("teamUpdate")}</button
      >
      <button
        class="popup__btn popup__btn--warning"
        type="button"
        on:click={() => (showDebug = !showDebug)}
        >{showDebug ? i18n("debugHide") : i18n("debugShow")}</button
      >
      <button
        class="popup__btn popup__btn--danger"
        type="button"
        on:click={clearTeams}>{i18n("teamsClear")}</button
      >
    </div>
  </footer>

  {#if showDebug}
    <pre class="popup__debug">{JSON.stringify(
        { teams, session },
        null,
        2,
      )}</pre>
  {/if}
</div>

<style lang="scss">
  @use "mixins" as *;
  @reference "tailwindcss";

  @mixin dark-styles {
    @include dark-theme;

    .popup__panel {
      @include dark-panel;
    }

    .popup__list-item--absent {
      @include absent-dark;
      @apply rounded-md px-2 border-l-2;
    }

    .popup__speaker-btn {
      @include icon-button(
        $color-dark-panel,
        $color-dark-muted,
        $color-success-light,
        $color-success-light
      );
    }

    .popup__absent-btn {
      @include icon-button(
        $color-dark-panel,
        $color-dark-muted,
        $color-danger-light,
        $color-danger-light
      );
    }

    .popup__footer {
      @include dark-theme;
      @apply border-slate-700;
    }

    .popup__select {
      background-color: $color-dark-panel;
      border-color: $color-dark-border;
      color: $color-dark-text;
    }

    .popup__theme-toggle {
      border-color: $color-dark-border;
    }

    .popup__theme-btn {
      background-color: $color-dark-panel;
      color: $color-dark-muted;

      &:hover {
        background-color: $color-dark-border;
      }

      &--active {
        background-color: $color-dark-border;
        color: $color-btn-contrast;
      }
    }
  }

  .popup {
    @include light-theme;
    @apply min-w-80;
    transition:
      background-color 150ms ease,
      color 150ms ease;

    &__body {
      @apply p-4 space-y-3;
    }

    &[data-theme="dark"] {
      @include dark-styles;
    }

    &[data-theme="auto"] {
      @media (prefers-color-scheme: dark) {
        @include dark-styles;
      }
    }

    &__header {
      @apply flex items-center justify-between;
    }

    &__title {
      @apply m-0 text-base font-semibold tracking-wide;
    }

    &__theme-toggle {
      @apply flex rounded-md overflow-hidden;
      border: 1px solid $color-light-border;
    }

    &__theme-btn {
      @apply px-2 py-1 text-xs border-0 cursor-pointer transition-colors;
      background-color: white;
      color: $color-light-muted;

      &:hover {
        background-color: $color-light-border;
      }

      &--active {
        background-color: $color-light-text;
        color: $color-btn-contrast;
      }
    }

    &__panel {
      @apply rounded-lg p-3;
      background-color: $color-light-panel;
      border: 1px solid $color-light-border;
    }

    &__list {
      @apply space-y-2;
      list-style: disc;
      padding-left: 1.25rem;
    }

    &__list-item {
      @apply flex items-center justify-between gap-2;

      &--spoken {
        @include spoken-state;
      }

      &--absent {
        @include absent-light;
        @apply rounded-md px-2 border-l-2;

        .popup__speaker-btn {
          @apply pointer-events-none opacity-30;
        }

        .popup__absent-btn {
          @include icon-button(
            $color-danger-light,
            $color-danger-light,
            $color-danger-light,
            $color-danger-light
          );
        }
      }
    }

    &__speaker-btn {
      @include icon-button(
        $color-light-border,
        $color-light-muted,
        $color-success,
        $color-success
      );
    }

    &__participant-name {
      @apply flex-1 text-sm;
    }

    &__absent-btn {
      @include icon-button(
        $color-light-border,
        $color-light-muted,
        $color-danger,
        $color-danger
      );
    }

    &__footer {
      @apply flex flex-col gap-2 p-4 border-t;
      background-color: $color-light-bg;
      border-color: $color-light-border;
    }

    &__select {
      @apply w-full rounded-md px-3 py-2 text-sm;
      background-color: $color-light-panel;
      border: 1px solid $color-light-border;
      color: $color-light-text;
    }

    &__actions {
      @apply grid grid-cols-2 gap-2;
    }

    &__btn {
      @include button-primary;

      &--warning {
        @include button-warning;
      }

      &--teal {
        @include button-teal;
      }

      &--danger {
        @include button-danger;
      }
    }
  }

  .popup__debug {
    @apply rounded-md p-3 text-xs overflow-auto;
    background-color: $color-dark-bg;
    color: $color-dark-text;
  }
</style>
