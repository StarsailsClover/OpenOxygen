<template>
  <div class="search-bar">
    <SearchIcon class="search-icon" />
    <input
      v-model="query"
      type="text"
      class="search-input"
      placeholder="Search skills, tasks, or settings..."
      @keyup.enter="search"
    />
    <button v-if="query" class="clear-btn" @click="clear">×</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import SearchIcon from "./icons/SearchIcon.vue";

const query = ref("");

const search = () => {
  if (query.value.trim()) {
    console.log("Searching:", query.value);
    // Emit search event or call search function
  }
};

const clear = () => {
  query.value = "";
};
</script>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.2s;
}

.search-bar:focus-within {
  border-color: var(--accent-primary);
}

.search-icon {
  width: 16px;
  height: 16px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.clear-btn {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: var(--bg-hover);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.clear-btn:hover {
  background: var(--bg-active);
  color: var(--text-primary);
}
</style>
