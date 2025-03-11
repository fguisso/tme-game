<script setup lang="ts">
import ThreatModelingGame from './components/ThreatModelingGame.vue'
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="text-3xl font-bold">Threat Modeling Game</h1>
      <p class="text-gray-600">Test your threat modeling skills by placing elements in their correct positions.</p>
    </header>
    <main class="app-content">
      <ThreatModelingGame />
    </main>
    <footer class="app-footer">
      <p class="text-sm text-gray-500">© 2023 Threat Modeling Express Game | Learn more about <a href="https://owasp.org/www-community/Threat_Modeling" target="_blank" class="text-blue-500 hover:underline">threat modeling</a></p>
    </footer>
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #334155;
  background-color: #f8fafc;
  width: 100vw;
  overflow-x: hidden;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100vw;
  max-width: 100%;
  margin: 0;
  padding: 0;
}

.app-header {
  padding: 1rem;
  background-color: white;
  border-bottom: 1px solid #e2e8f0;
  text-align: center;
  width: 100%;
}

.app-content {
  flex: 1;
  width: 100%;
  padding: 0;
  margin: 0;
}

.app-footer {
  padding: 0.75rem;
  text-align: center;
  background-color: white;
  border-top: 1px solid #e2e8f0;
  width: 100%;
}

@media (max-width: 640px) {
  .app-header {
    padding: 0.75rem;
  }
}
</style>
