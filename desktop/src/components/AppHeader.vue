<template>
  <header class="app-header">
    <div class="header-left">
      <img src="/logo.svg" alt="OpenOxygen" class="logo" />
      <h1 class="app-title">OpenOxygen</h1>
    </div>
    <div class="header-center">
      <SearchBar />
    </div>
    <div class="header-right">
      <button class="btn-icon" @click="toggleSettings">
        <SettingsIcon />
      </button>
      <button class="btn-icon" @click="minimizeWindow">
        <MinimizeIcon />
      </button>
      <button class="btn-icon" @click="closeWindow">
        <CloseIcon />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { appWindow } from "@tauri-apps/api/window";
import SearchBar from "./SearchBar.vue";
import SettingsIcon from "./icons/SettingsIcon.vue";
import MinimizeIcon from "./icons/MinimizeIcon.vue";
import CloseIcon from "./icons/CloseIcon.vue";

const toggleSettings = () => {
  // Open settings panel
};

const minimizeWindow = async () => {
  await appWindow.minimize();
};

const closeWindow = async () => {
  await appWindow.hide();
};
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  -webkit-app-region: drag;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  -webkit-app-region: no-drag;
}

.logo {
  width: 28px;
  height: 28px;
}

.app-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.header-center {
  flex: 1;
  max-width: 400px;
  margin: 0 16px;
  -webkit-app-region: no-drag;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
</style>
