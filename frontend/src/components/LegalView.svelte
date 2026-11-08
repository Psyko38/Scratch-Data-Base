<script>
  export let onBackToExplorer = () => {};
  export let initialTab = 'about';

  let activeTab = initialTab;

  function setTab(tab) {
    activeTab = tab;
  }
</script>

<div class="legal-container">
  <div class="legal-card">
    <div class="legal-header">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <h1 class="legal-title">Scratch AI – Legal, Privacy & Compliance</h1>
          <p class="legal-subtitle">Open, collaborative community AI classification for Scratch projects</p>
        </div>
        <button class="btn btn-secondary" on:click={onBackToExplorer}>
          ← Back to Community Explorer
        </button>
      </div>

      <nav class="legal-nav" style="margin-top: 1.5rem;">
        <button class="subhero-pill" class:active={activeTab === 'about'} on:click={() => setTab('about')}>
          ℹ️ About & Methodology
        </button>
        <button class="subhero-pill" class:active={activeTab === 'legal-notice'} on:click={() => setTab('legal-notice')}>
          ⚖️ Legal Notice (LCEN)
        </button>
        <button class="subhero-pill" class:active={activeTab === 'privacy'} on:click={() => setTab('privacy')}>
          🛡️ Privacy Policy (GDPR)
        </button>
        <button class="subhero-pill" class:active={activeTab === 'terms'} on:click={() => setTab('terms')}>
          📜 Terms of Service
        </button>
      </nav>
    </div>

    <!-- Section 1: About & Methodology -->
    {#if activeTab === 'about'}
      <section id="about" class="legal-section">
        <h2>ℹ️ About Scratch AI & Detection Methodology</h2>
        <p>
          <strong>Scratch AI</strong> is an independent, community-driven initiative dedicated to detecting AI-generated Scratch projects and celebrating authentic human creativity across the <a href="https://scratch.mit.edu" target="_blank" rel="noopener noreferrer">Scratch platform</a>.
        </p>

        <h3>How Community Classification Works</h3>
        <p>
          Scratch AI operates entirely on transparent, democratic community consensus:
        </p>
        <ul>
          <li><strong>One Vote Per User</strong>: Each participant may register at most one vote per Scratch project. Voting again simply updates the existing vote without inflating counts.</li>
          <li><strong>Minimum Threshold (5 Votes)</strong>: To prevent spam and volatile swings, projects with fewer than 5 votes display an <em>Insufficient data</em> verdict.</li>
          <li><strong>Majority Formula</strong>: Once at least 5 votes are recorded:
            <ul>
              <li><strong>AI-generated</strong>: More than 50% of submitted votes classify the project as AI.</li>
              <li><strong>Human-created</strong>: Fewer than 50% of submitted votes classify the project as AI.</li>
              <li><strong>Undetermined</strong>: Exactly 50% AI and 50% Human votes.</li>
            </ul>
          </li>
        </ul>

        <blockquote>
          <strong>Important Disclaimer:</strong> Community classifications represent crowdsourced user opinions and are NOT technically verified AI analyses or cryptographic proofs.
        </blockquote>
      </section>
    {/if}

    <!-- Section 2: Legal Notice (LCEN) -->
    {#if activeTab === 'legal-notice'}
      <section id="legal-notice" class="legal-section">
        <h2>⚖️ Legal Notice (Mentions Légales – French LCEN)</h2>
        <p>
          In accordance with Article 6 of French Law No. 2004-575 of June 21, 2004 regarding Confidence in the Digital Economy (LCEN), the identity of participants involved in the publication and hosting of Scratch AI is provided below:
        </p>
        <table class="legal-info-table">
          <tbody>
            <tr>
              <td><strong>Editor & Project Maintainer:</strong></td>
              <td>Scratch AI Community Maintainers (<a href="https://github.com/Psyko38/Scratch-Data-Base" target="_blank" rel="noopener noreferrer">GitHub: Psyko38/Scratch-Data-Base</a>)</td>
            </tr>
            <tr>
              <td><strong>Hosting Provider:</strong></td>
              <td>
                Alwaysdata SARL<br>
                91 rue du Faubourg Saint-Honoré, 75008 Paris, France<br>
                Website: <a href="https://www.alwaysdata.com" target="_blank" rel="noopener noreferrer">alwaysdata.com</a>
              </td>
            </tr>
            <tr>
              <td><strong>Intellectual Property & Non-Affiliation:</strong></td>
              <td>
                Scratch is a trademark of the Scratch Foundation and MIT Media Lab. Scratch AI is an independent community project and is NOT affiliated with, sponsored by, or endorsed by the Scratch Foundation or the Massachusetts Institute of Technology.
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    {/if}

    <!-- Section 3: Privacy Policy (GDPR) -->
    {#if activeTab === 'privacy'}
      <section id="privacy" class="legal-section">
        <h2>🛡️ Privacy Policy & GDPR Compliance</h2>
        <p>
          Scratch AI adheres strictly to the European General Data Protection Regulation (GDPR - EU 2016/679).
        </p>
        <h3>Data Minimization by Design</h3>
        <ul>
          <li><strong>No User Accounts</strong>: Scratch AI requires no personal information, email addresses, names, or Scratch passwords.</li>
          <li><strong>Anonymous Voter UUID</strong>: A randomized UUID (e.g. <code>a1b2c3d4-e5f6...</code>) is generated locally in browser extension storage solely for deduplicating votes.</li>
          <li><strong>Public Voter Masking</strong>: In all public listings, voter UUIDs are securely masked (e.g. <code>a1b2c3...f6e5</code>) to preserve anonymity.</li>
          <li><strong>No Commercial Tracking</strong>: Scratch AI uses zero tracking scripts, zero advertising networks, and zero invasive third-party telemetry.</li>
        </ul>
        <h3>Rights under GDPR</h3>
        <p>
          Users may request deletion of their voting record or unlinking of their anonymous UUID at any time by contacting the maintainers through our public GitHub repository.
        </p>
      </section>
    {/if}

    <!-- Section 4: Terms of Service -->
    {#if activeTab === 'terms'}
      <section id="terms" class="legal-section">
        <h2>📜 Terms of Service</h2>
        <p>
          By using Scratch AI or the Scratch AI browser extension, you agree to these Terms of Service:
        </p>
        <ol>
          <li><strong>Fair Community Participation</strong>: Users must vote in good faith and refrain from coordinated botting, vote manipulation, or harassment of Scratch creators.</li>
          <li><strong>Abuse Prevention</strong>: The administrative team reserves the right to ban malicious UUIDs and purge fraudulent votes to protect data integrity.</li>
          <li><strong>Open Data</strong>: Voting aggregates and project metrics are released under the Open Database License for public community benefit.</li>
        </ol>
      </section>
    {/if}
  </div>
</div>
