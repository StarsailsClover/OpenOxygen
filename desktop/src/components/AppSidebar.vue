<template>
  <aside class="app-sidebar">
    <nav class="sidebar-nav">
      <router-link
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: $route.path === item.path }"
      >
        <component :is="item.icon" class="nav-icon" />
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>
    
    <div class="sidebar-section">
      <h3 class="section-title">Skills</h3>
      <div class="skill-list">
        <button
          v-for="skill in recentSkills"
          :key="skill.id"
          class="skill-item"
          @click="executeSkill(skill)"
        >
          <span class="skill-name">{{ skill.name }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from "vue";
import HomeIcon from "./icons/HomeIcon.vue";
import BrowserIcon from "./icons/BrowserIcon.vue";
import SkillsIcon from "./icons/SkillsIcon.vue";
import MemoryIcon from "./icons/MemoryIcon.vue";
import SettingsIcon from "./icons/SettingsIcon.vue";

const menuItems = [
  { path: "/", label: "Dashboard", icon: HomeIcon },
  { path: "/browser", label: "Browser", icon: BrowserIcon },
  { path: "/skills", label: "Skills", icon: SkillsIcon },
  { path: "/memory", label: "Memory", icon: MemoryIcon },
  { path: "/settings", label: "Settings", icon: SettingsIcon },
];

const recentSkills = ref([
  { id: "browser.launch", name: "Launch Browser" },
  { id: "office.word.create", name: "Create Document" },
  { id: "system.file.list", name: "List Files" },
]);

const executeSkill = (skill: { id: string; name: string }) => {
  // Execute skill via OpenOxygen core
  console.log("Executing skill:", skill.id);
};
</script>

<style scoped>
.app-sidebar {
  width: 240px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  padding: 16px 0;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--accent-primary);
  color: white;
}

.nav-icon {
  width: 20px;
  height: 20px;
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
}

.sidebar-section {
  margin-top: 24px;
  padding: 0 12px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px 16px;
}

.skill-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skill-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.skill-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
</style>
