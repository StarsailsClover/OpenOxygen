<template>
  <div class="dashboard">
    <h2>Dashboard</h2>
    <div class="dashboard-grid">
      <div class="card">
        <h3>System Status</h3>
        <div class="status-item">
          <span class="status-label">Gateway:</span>
          <span class="status-value online">Online</span>
        </div>
        <div class="status-item">
          <span class="status-label">OLB:</span>
          <span class="status-value online">Ready</span>
        </div>
        <div class="status-item">
          <span class="status-label">Memory:</span>
          <span class="status-value">{{ memoryUsage }}%</span>
        </div>
      </div>
      
      <div class="card">
        <h3>Recent Tasks</h3>
        <ul class="task-list">
          <li v-for="task in recentTasks" :key="task.id" class="task-item">
            <span class="task-name">{{ task.name }}</span>
            <span class="task-status" :class="task.status">{{ task.status }}</span>
          </li>
        </ul>
      </div>
      
      <div class="card">
        <h3>Quick Actions</h3>
        <div class="action-buttons">
          <button class="btn-primary" @click="launchBrowser">
            Launch Browser
          </button>
          <button class="btn-secondary" @click="openSkills">
            Browse Skills
          </button>
          <button class="btn-secondary" @click="openMemory">
            View Memory
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const memoryUsage = ref(42);

const recentTasks = ref([
  { id: "1", name: "File organization", status: "completed" },
  { id: "2", name: "Web scraping", status: "running" },
  { id: "3", name: "Document analysis", status: "pending" },
]);

const launchBrowser = () => {
  router.push("/browser");
};

const openSkills = () => {
  router.push("/skills");
};

const openMemory = () => {
  router.push("/memory");
};
</script>

<style scoped>
.dashboard {
  padding: 24px;
}

.dashboard h2 {
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--border-color);
}

.card h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.status-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.status-item:last-child {
  border-bottom: none;
}

.status-label {
  color: var(--text-secondary);
}

.status-value {
  font-weight: 500;
}

.status-value.online {
  color: var(--success-color);
}

.task-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color);
}

.task-item:last-child {
  border-bottom: none;
}

.task-name {
  color: var(--text-primary);
}

.task-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.task-status.completed {
  background: var(--success-bg);
  color: var(--success-color);
}

.task-status.running {
  background: var(--warning-bg);
  color: var(--warning-color);
}

.task-status.pending {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-primary,
.btn-secondary {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
  border: none;
}

.btn-primary:hover {
  background: var(--accent-primary-hover);
}

.btn-secondary {
  background: var(--bg-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-active);
}
</style>
