<template>
  <div class="browser-view">
    <h2>OxygenBrowser</h2>
    <div class="browser-container">
      <div class="browser-toolbar">
        <button class="btn-nav" @click="goBack">←</button>
        <button class="btn-nav" @click="goForward">→</button>
        <button class="btn-nav" @click="reload">↻</button>
        <input
          v-model="url"
          type="text"
          class="url-bar"
          placeholder="Enter URL..."
          @keyup.enter="navigate"
        />
        <button class="btn-nav" @click="navigate">Go</button>
      </div>
      <div class="browser-content">
        <div class="browser-placeholder">
          <p>WebView2 Browser Integration</p>
          <p class="hint">OxygenBrowser will be embedded here</p>
          <button class="btn-launch" @click="launchBrowser">
            Launch Browser
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const url = ref("https://example.com");

const navigate = () => {
  console.log("Navigating to:", url.value);
};

const goBack = () => {
  console.log("Going back");
};

const goForward = () => {
  console.log("Going forward");
};

const reload = () => {
  console.log("Reloading");
};

const launchBrowser = () => {
  // Launch OxygenBrowser via Tauri command
  console.log("Launching OxygenBrowser");
};
</script>

<style scoped>
.browser-view {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.browser-view h2 {
  margin: 0 0 16px 0;
}

.browser-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.browser-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
}

.btn-nav {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-nav:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.url-bar {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
}

.url-bar:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.browser-content {
  flex: 1;
  position: relative;
}

.browser-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.browser-placeholder p {
  margin: 8px 0;
}

.hint {
  font-size: 14px;
  opacity: 0.7;
}

.btn-launch {
  margin-top: 16px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: var(--accent-primary);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-launch:hover {
  background: var(--accent-primary-hover);
}
</style>
