/**
 * HTN Example Domains
 * 
 * Pre-defined HTN domains for common use cases
 */

import { HTNDomainBuilder, HTNPrimitiveTask, HTNCompoundTask } from "./index.js";
import { skillRegistry } from "../../skills/registry.js";

// ============================================================================
// File Management Domain
// ============================================================================

export const fileManagementDomain = new HTNDomainBuilder(
  "file-management",
  "File Management"
)
  .setInitialState({
    currentDir: "/",
    files: [],
    selectedFiles: [],
  })
  
  // Primitive: List files
  .addPrimitiveTask({
    id: "list-files",
    name: "List Files",
    type: "primitive",
    parameters: { path: "/" },
    executor: async (params) => {
      return skillRegistry.execute("system.file.list", params.path);
    },
  } as HTNPrimitiveTask)
  
  // Primitive: Copy file
  .addPrimitiveTask({
    id: "copy-file",
    name: "Copy File",
    type: "primitive",
    parameters: { source: "", dest: "" },
    preconditions: [
      { type: "exists", field: "source" },
    ],
    executor: async (params) => {
      return skillRegistry.execute("system.file.copy", params.source, params.dest);
    },
  } as HTNPrimitiveTask)
  
  // Primitive: Move file
  .addPrimitiveTask({
    id: "move-file",
    name: "Move File",
    type: "primitive",
    parameters: { source: "", dest: "" },
    preconditions: [
      { type: "exists", field: "source" },
    ],
    executor: async (params) => {
      return skillRegistry.execute("system.file.move", params.source, params.dest);
    },
  } as HTNPrimitiveTask)
  
  // Compound: Organize files
  .addCompoundTask({
    id: "organize-files",
    name: "Organize Files",
    type: "compound",
    parameters: { sourceDir: "", targetDir: "" },
    methods: [
      {
        id: "organize-by-type",
        name: "Organize by Type",
        subtasks: [
          { id: "list-files", name: "List Files", type: "primitive" } as HTNPrimitiveTask,
          { id: "categorize-files", name: "Categorize Files", type: "primitive" } as HTNPrimitiveTask,
          { id: "move-file", name: "Move File", type: "primitive" } as HTNPrimitiveTask,
        ],
      },
    ],
  } as HTNCompoundTask)
  
  .build();

// ============================================================================
// Web Automation Domain
// ============================================================================

export const webAutomationDomain = new HTNDomainBuilder(
  "web-automation",
  "Web Automation"
)
  .setInitialState({
    browserOpen: false,
    currentUrl: "",
    loggedIn: false,
  })
  
  // Primitive: Launch browser
  .addPrimitiveTask({
    id: "launch-browser",
    name: "Launch Browser",
    type: "primitive",
    executor: async () => {
      return skillRegistry.execute("browser.launch", { headless: false });
    },
  } as HTNPrimitiveTask)
  
  // Primitive: Navigate
  .addPrimitiveTask({
    id: "navigate",
    name: "Navigate to URL",
    type: "primitive",
    parameters: { url: "" },
    preconditions: [
      { type: "equals", field: "browserOpen", value: true },
    ],
    executor: async (params) => {
      // Get browser ID from state
      return { success: true, data: { navigated: true } };
    },
  } as HTNPrimitiveTask)
  
  // Primitive: Click element
  .addPrimitiveTask({
    id: "click-element",
    name: "Click Element",
    type: "primitive",
    parameters: { selector: "" },
    executor: async (params) => {
      return skillRegistry.execute("browser.click", "browser-1", {
        type: "css",
        value: params.selector,
      });
    },
  } as HTNPrimitiveTask)
  
  // Primitive: Type text
  .addPrimitiveTask({
    id: "type-text",
    name: "Type Text",
    type: "primitive",
    parameters: { selector: "", text: "" },
    executor: async (params) => {
      return skillRegistry.execute("browser.type", "browser-1", {
        type: "css",
        value: params.selector,
      }, params.text);
    },
  } as HTNPrimitiveTask)
  
  // Compound: Login
  .addCompoundTask({
    id: "login",
    name: "Login",
    type: "compound",
    parameters: { username: "", password: "" },
    methods: [
      {
        id: "standard-login",
        name: "Standard Login",
        subtasks: [
          { id: "launch-browser", name: "Launch Browser", type: "primitive" } as HTNPrimitiveTask,
          { id: "navigate", name: "Navigate", type: "primitive" } as HTNPrimitiveTask,
          { id: "type-text", name: "Enter Username", type: "primitive" } as HTNPrimitiveTask,
          { id: "type-text", name: "Enter Password", type: "primitive" } as HTNPrimitiveTask,
          { id: "click-element", name: "Click Login", type: "primitive" } as HTNPrimitiveTask,
        ],
      },
    ],
  } as HTNCompoundTask)
  
  .build();

// ============================================================================
// Data Processing Domain
// ============================================================================

export const dataProcessingDomain = new HTNDomainBuilder(
  "data-processing",
  "Data Processing"
)
  .setInitialState({
    dataLoaded: false,
    dataProcessed: false,
    outputReady: false,
  })
  
  // Primitive: Load data
  .addPrimitiveTask({
    id: "load-data",
    name: "Load Data",
    type: "primitive",
    parameters: { source: "" },
    executor: async (params) => {
      return skillRegistry.execute("system.file.read", params.source);
    },
  } as HTNPrimitiveTask)
  
  // Primitive: Process data
  .addPrimitiveTask({
    id: "process-data",
    name: "Process Data",
    type: "primitive",
    parameters: { data: "" },
    preconditions: [
      { type: "equals", field: "dataLoaded", value: true },
    ],
    executor: async (params) => {
      // Process data
      return { success: true, data: { processed: true } };
    },
  } as HTNPrimitiveTask)
  
  // Primitive: Save results
  .addPrimitiveTask({
    id: "save-results",
    name: "Save Results",
    type: "primitive",
    parameters: { dest: "", data: "" },
    preconditions: [
      { type: "equals", field: "dataProcessed", value: true },
    ],
    executor: async (params) => {
      return skillRegistry.execute("system.file.write", params.dest, params.data);
    },
  } as HTNPrimitiveTask)
  
  // Compound: ETL Pipeline
  .addCompoundTask({
    id: "etl-pipeline",
    name: "ETL Pipeline",
    type: "compound",
    parameters: { source: "", dest: "" },
    methods: [
      {
        id: "standard-etl",
        name: "Standard ETL",
        subtasks: [
          { id: "load-data", name: "Load Data", type: "primitive" } as HTNPrimitiveTask,
          { id: "process-data", name: "Process Data", type: "primitive" } as HTNPrimitiveTask,
          { id: "save-results", name: "Save Results", type: "primitive" } as HTNPrimitiveTask,
        ],
      },
    ],
  } as HTNCompoundTask)
  
  .build();

// ============================================================================
// Export all domains
// ============================================================================

export const predefinedDomains = [
  fileManagementDomain,
  webAutomationDomain,
  dataProcessingDomain,
];
