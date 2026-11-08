<script>
  import { onMount } from 'svelte';
  import { fetchCommunityStats, getApiBase } from './api.js';
  import { initTheme } from './stores/theme.js';
  import { initAuth, isAdminLoggedIn } from './stores/auth.js';
  import { showToast } from './stores/toast.js';

  import Navbar from './components/Navbar.svelte';
  import Hero from './components/Hero.svelte';
  import SubheroPills from './components/SubheroPills.svelte';
  import AdminUsers from './components/AdminUsers.svelte';
  import ProjectCarousel from './components/ProjectCarousel.svelte';
  import CommunityStats from './components/CommunityStats.svelte';
  import RecentVotes from './components/RecentVotes.svelte';
  import ExtensionDownload from './components/ExtensionDownload.svelte';
  import ProjectModal from './components/ProjectModal.svelte';
  import AdminLoginModal from './components/AdminLoginModal.svelte';
  import LegalView from './components/LegalView.svelte';
  import Footer from './components/Footer.svelte';
  import ToastContainer from './components/ToastContainer.svelte';

  let currentView = 'explorer'; // 'explorer' | 'legal'
  let legalTab = 'about';
  let statsData = {
    metrics: { totalUsers: 0, totalProjects: 0, totalVotes: 0, aiVotes: 0, humanVotes: 0, aiPercentage: 0, humanPercentage: 0 },
    mostVotedProjects: [],
    topAiProjects: [],
    topHumanProjects: [],
    recentVotes: []
  };

  let activeProjectId = null;
  let isProjectModalOpen = false;
  let isAdminLoginOpen = false;

  $: apiBase = getApiBase();

  async function loadData() {
    try {
      const data = await fetchCommunityStats();
      statsData = data;
    } catch (err) {
      console.error('Failed to load community stats:', err);
    }
  }

  function handleSearch(id) {
    activeProjectId = id;
    isProjectModalOpen = true;
  }

  function handleInspectProject(id) {
    activeProjectId = id;
    isProjectModalOpen = true;
  }

  function handleCloseProjectModal() {
    isProjectModalOpen = false;
    activeProjectId = null;
  }

  function handleOpenAdminLogin() {
    isAdminLoginOpen = true;
  }

  function handleCloseAdminLogin() {
    isAdminLoginOpen = false;
  }

  function handleAdminLoginSuccess(username) {
    scrollToElement('adminUsersSection');
  }

  function handleFocusSearch() {
    const input = document.getElementById('searchProjectIdInput');
    if (input) {
      input.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function scrollToElement(id) {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  }

  function handleNavigate(view, hash) {
    currentView = view;
    if (view === 'legal') {
      legalTab = hash || 'about';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (view === 'explorer') {
      if (hash) {
        scrollToElement(hash);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  function checkInitialRoute() {
    const pathname = window.location.pathname.toLowerCase();
    const hash = (window.location.hash || '').replace('#', '');

    if (pathname.includes('/legal') || hash === 'legal-notice') {
      currentView = 'legal';
      legalTab = 'legal-notice';
    } else if (pathname.includes('/privacy') || hash === 'privacy') {
      currentView = 'legal';
      legalTab = 'privacy';
    } else if (pathname.includes('/terms') || hash === 'terms') {
      currentView = 'legal';
      legalTab = 'terms';
    } else if (pathname.includes('/about') || hash === 'about') {
      currentView = 'legal';
      legalTab = 'about';
    } else if (pathname.endsWith('/admin') || pathname.endsWith('/admin/')) {
      currentView = 'explorer';
      if (!$isAdminLoggedIn) {
        isAdminLoginOpen = true;
      } else {
        scrollToElement('adminUsersSection');
      }
    } else if (hash) {
      scrollToElement(hash);
    }
  }

  onMount(async () => {
    initTheme();
    await initAuth();
    await loadData();
    checkInitialRoute();

    window.addEventListener('hashchange', () => {
      const h = window.location.hash.replace('#', '');
      if (['about', 'legal-notice', 'privacy', 'terms'].includes(h)) {
        currentView = 'legal';
        legalTab = h;
      } else if (h) {
        currentView = 'explorer';
        scrollToElement(h);
      }
    });
  });
</script>

<div class="app-root">
  <Navbar
    onSearch={handleSearch}
    onOpenAdminLogin={handleOpenAdminLogin}
    onNavigate={handleNavigate}
  />

  {#if currentView === 'legal'}
    <LegalView
      initialTab={legalTab}
      onBackToExplorer={() => handleNavigate('explorer', '')}
    />
  {:else}
    <Hero
      metrics={statsData.metrics}
      onFocusSearch={handleFocusSearch}
      onScrollToStats={() => scrollToElement('statsSection')}
    />

    <SubheroPills
      onScroll={scrollToElement}
    />

    <main class="scratch-main" id="carouselsSection">
      <AdminUsers
        onVotesChanged={loadData}
      />

      <!-- Carousel 1: Most Voted Projects -->
      <ProjectCarousel
        title="Featured Projects (Most Voted)"
        projects={statsData.mostVotedProjects}
        emptyMsg="No projects rated by the community yet."
        headerActionText="↻ Refresh Live Data"
        onHeaderAction={loadData}
        onInspectProject={handleInspectProject}
      />

      <!-- Carousel 2: Suspected AI Projects -->
      <ProjectCarousel
        title="Suspected AI-Generated – Flagged by Community"
        projects={statsData.topAiProjects && statsData.topAiProjects.length > 0
          ? statsData.topAiProjects
          : (statsData.mostVotedProjects || []).filter(p => p.aiVotes > 0)}
        emptyMsg="No projects flagged as AI yet."
        headerActionText="Export List"
        headerActionHref="{apiBase}/export/csv?type=projects"
        onInspectProject={handleInspectProject}
      />

      <!-- Carousel 3: Verified Human Creations -->
      <ProjectCarousel
        title="Verified Human Creations – Community Favorites"
        projects={statsData.topHumanProjects && statsData.topHumanProjects.length > 0
          ? statsData.topHumanProjects
          : (statsData.mostVotedProjects || []).filter(p => p.humanVotes > 0)}
        emptyMsg="No projects verified as Human yet."
        headerActionText="Visit Scratch ↗"
        headerActionHref="https://scratch.mit.edu/explore/projects/all"
        headerActionExternal={true}
        onInspectProject={handleInspectProject}
      />

      <!-- Global Community Stats -->
      <CommunityStats
        metrics={statsData.metrics}
        topProjects={statsData.mostVotedProjects}
        onInspectProject={handleInspectProject}
      />

      <!-- Live Recent Votes Stream -->
      <RecentVotes
        votes={statsData.recentVotes}
        onInspectProject={handleInspectProject}
      />

      <!-- Browser Extension Downloads -->
      <ExtensionDownload />
    </main>
  {/if}

  <Footer
    onNavigate={handleNavigate}
    onOpenAdminLogin={handleOpenAdminLogin}
  />

  <!-- Inspection Modal -->
  <ProjectModal
    projectId={activeProjectId}
    isOpen={isProjectModalOpen}
    onClose={handleCloseProjectModal}
  />

  <!-- Admin Login Modal -->
  <AdminLoginModal
    isOpen={isAdminLoginOpen}
    onClose={handleCloseAdminLogin}
    onSuccess={handleAdminLoginSuccess}
  />

  <!-- Toast Notification Stack -->
  <ToastContainer />
</div>
