/**
 * OpenOxygen - Scripting Module Index (26w15aF Phase A.3)
 *
 * P-2: Script template system and component library
 */

// Template System
export {
  ScriptTemplateSystem,
  type ScriptTemplate,
  type TemplateParameter,
  type ValidationResult,
} from "./template-system.js";

// Component Library
export {
  ExtendedComponentLibrary,
  type ExtendedComponent,
  type ExtendedComponentType,
  type ComponentInstance,
} from "./component-library.js";

// Default exports
import { ScriptTemplateSystem } from "./template-system.js";
import { ExtendedComponentLibrary } from "./component-library.js";

export const Scripting = {
  TemplateSystem: ScriptTemplateSystem,
  ComponentLibrary: ExtendedComponentLibrary,
};

export default Scripting;
