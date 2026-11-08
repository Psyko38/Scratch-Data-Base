<script>
  import { getApiBase } from '../api.js';
  import { isAdminLoggedIn } from '../stores/auth.js';

  export let onNavigate = (view, hash) => {};
  export let onOpenAdminLogin = () => {};

  $: apiBase = getApiBase();

  function handleAdminClick(e) {
    e.preventDefault();
    if ($isAdminLoggedIn) {
      onNavigate('explorer', 'adminUsersSection');
    } else {
      onOpenAdminLogin();
    }
  }
</script>

<footer class="scratch-footer">
  <div class="scratch-footer-inner">
    <div class="footer-col">
      <h4>About & Legal</h4>
      <ul>
        <li><a href="#about" on:click|preventDefault={() => onNavigate('legal', 'about')}>About Scratch AI</a></li>
        <li><a href="#about" on:click|preventDefault={() => onNavigate('legal', 'about')}>Voting Methodology</a></li>
        <li><a href="#legal-notice" on:click|preventDefault={() => onNavigate('legal', 'legal-notice')}>Legal Notice (LCEN)</a></li>
        <li><a href="#privacy" on:click|preventDefault={() => onNavigate('legal', 'privacy')}>Privacy Policy (GDPR)</a></li>
        <li><a href="#terms" on:click|preventDefault={() => onNavigate('legal', 'terms')}>Terms of Service</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Community</h4>
      <ul>
        <li><a href="#carouselsSection" on:click|preventDefault={() => onNavigate('explorer', 'carouselsSection')}>Featured Projects</a></li>
        <li><a href="#recentVotesSection" on:click|preventDefault={() => onNavigate('explorer', 'recentVotesSection')}>Live Votes Stream</a></li>
        <li><a href="https://scratch.mit.edu" target="_blank" rel="noopener noreferrer">Official Scratch Website ↗</a></li>
        <li><a href="{apiBase}/health" target="_blank" rel="noopener noreferrer">API Server Health</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Resources & Data</h4>
      <ul>
        <li><a href="{apiBase}/extension/download?browser=chrome">Chrome Extension (.zip)</a></li>
        <li><a href="{apiBase}/extension/download?browser=firefox">Firefox Extension (.zip)</a></li>
        <li><a href="{apiBase}/export/csv?type=votes">Download Votes (CSV)</a></li>
        <li><a href="{apiBase}/export/csv?type=projects">Download Projects (CSV)</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Administration</h4>
      <ul>
        <li>
          <a href="#adminUsersSection" id="footerAdminLink" on:click={handleAdminClick}>
            User Management
          </a>
        </li>
      </ul>
    </div>
  </div>
  <div class="scratch-footer-bottom">
    <p>
      Scratch AI is an independent community project and is not affiliated with the Scratch Team or the MIT Media Lab.
      <a href="#legal-notice" style="color: inherit; text-decoration: underline;" on:click|preventDefault={() => onNavigate('legal', 'legal-notice')}>
        Legal Notice & Privacy Policy
      </a>.
    </p>
  </div>
</footer>
