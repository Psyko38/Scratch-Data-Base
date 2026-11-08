<script>
  import { getApiBase } from '../api.js';

  $: apiBase = getApiBase();
</script>

<section class="scratch-box" id="extensionDownloadSection">
  <div class="scratch-box-header">
    <h2 class="scratch-box-title">🧩 Download Scratch AI Extension (Chrome & Firefox)</h2>
    <span class="box-header-sub">Vote and view verdicts directly on scratch.mit.edu</span>
  </div>
  <div class="scratch-box-body">
    <div class="ext-download-grid">
      <!-- Chrome Card -->
      <div class="ext-download-card">
        <div class="ext-card-top">
          <span class="ext-browser-icon">🌐</span>
          <div>
            <h3 class="ext-browser-title">Google Chrome / Brave / Edge</h3>
            <p class="ext-browser-sub">Ready-to-load Manifest V3 package</p>
          </div>
        </div>
        <ol class="ext-steps">
          <li>Download and unzip the <code>.zip</code> archive.</li>
          <li>Open <code>chrome://extensions</code> and enable <strong>Developer mode</strong>.</li>
          <li>Click <strong>Load unpacked</strong> and select the extracted folder.</li>
        </ol>
        <a href="{apiBase}/extension/download?browser=chrome" class="btn btn-primary ext-dl-btn">
          📥 Download for Chrome (.zip)
        </a>
      </div>

      <!-- Firefox Card -->
      <div class="ext-download-card">
        <div class="ext-card-top">
          <span class="ext-browser-icon">🦊</span>
          <div>
            <h3 class="ext-browser-title">Mozilla Firefox</h3>
            <p class="ext-browser-sub">Gecko-compatible WebExtension archive</p>
          </div>
        </div>
        <ol class="ext-steps">
          <li>Download the Firefox <code>.zip</code> archive.</li>
          <li>Open <code>about:debugging#/runtime/this-firefox</code> in Firefox.</li>
          <li>Click <strong>Load Temporary Add-on...</strong> and select the <code>.zip</code> file.</li>
        </ol>
        <a href="{apiBase}/extension/download?browser=firefox" class="btn btn-primary ext-dl-btn" style="background: var(--scratch-orange);">
          📥 Download for Firefox (.zip)
        </a>
      </div>
    </div>
  </div>
</section>
