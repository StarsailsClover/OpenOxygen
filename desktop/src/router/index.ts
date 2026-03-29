import { createRouter, createWebHistory } from "vue-router";
import Dashboard from "../views/Dashboard.vue";
import Browser from "../views/Browser.vue";
import Skills from "../views/Skills.vue";
import Memory from "../views/Memory.vue";
import Settings from "../views/Settings.vue";

const routes = [
  {
    path: "/",
    name: "Dashboard",
    component: Dashboard,
  },
  {
    path: "/browser",
    name: "Browser",
    component: Browser,
  },
  {
    path: "/skills",
    name: "Skills",
    component: Skills,
  },
  {
    path: "/memory",
    name: "Memory",
    component: Memory,
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
