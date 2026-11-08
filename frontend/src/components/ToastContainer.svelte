<script>
  import { toasts } from '../stores/toast.js';
</script>

<div class="toast-container" id="toastContainer">
  {#each $toasts as toast (toast.id)}
    <div class="toast">
      <span>{toast.type === 'error' ? '❌' : toast.type === 'success' ? '✅' : 'ℹ️'}</span>
      <span>{toast.message}</span>
    </div>
  {/each}
</div>
