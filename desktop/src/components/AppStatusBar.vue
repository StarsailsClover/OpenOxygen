<template>
  <footer class="app-status-bar">
    <div class="status-left">
      <span class="status-item">
        <span class="status-indicator online"></span>
        Ready
      </span>
      <span class="status-separator">|</span>
      <span class="status-item">v26w13a</span>
    </div>
    <div class="status-center">
      <span v-if="currentTask" class="task-info">
        {{ currentTask }}
      </span>
    </div>
    <div class="status-right">
      <span class="status-item">{{ memoryUsage }} MB</span>
      <span class="status-separator">|</span>
      <span class="status-item">{{ cpuUsage }}%</span>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const currentTask = ref("");
const memoryUsage = ref(0);
const cpuUsage = ref(0);

let updateInterval: NodeJS.Timeout;

const updateStats = () => {
  // Simulate stats update
  // In real implementation, get from performance monitor
  memoryUsage.value = Math.floor(Math.random() * 200) + 100;
  cpuUsage.value = Math.floor(Math.random() * 30) + 5;
};

onMounted(() => {
  updateStats();
  updateInterval = setInterval(updateStats, 5000);
});

onUnmounted(() => {
  clearInterval(updateInterval);
});
</script>

<style scoped>
.app-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 0 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-secondary);
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-center {
  flex: 1;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-separator {
  color: var(--text-tertiary);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
}

.status-indicator.online {
  background: var(--success-color);
}

.status-indicator.busy {
  background: var(--warning-color);
}

.status-indicator.error {
  background: var(--error-color);
}

.task-info {
  color: var(--text-secondary);
}
</style>
