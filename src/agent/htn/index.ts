/**
 * OpenOxygen HTN (Hierarchical Task Network) Engine
 *
 * 层次化任务规划引�?
 */

export enum TaskType {
  PRIMITIVE = "primitive",
  COMPOUND = "compound",
  GOAL = "goal",
}

export interface HTNTask {
  id: string;
  name: string;
  type: TaskType;
  action?: () => Promise<boolean>;
  subtasks?: HTNTask[];
  dependencies?: string[];
}

export class HTNEngine {
  private tasks: Map<string, HTNTask> = new Map();

  registerTask(task: HTNTask): void {
    this.tasks.set(task.id, task);
  }

  async execute(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.type === TaskType.PRIMITIVE && task.action) {
      return await task.action();
    }

    if (task.subtasks) {
      for (const subtask of task.subtasks) {
        const success = await this.execute(subtask.id);
        if (!success) return false;
      }
    }

    return true;
  }

  createPlan(goal: string): HTNTask[] {
    // 简化实�?
    return [
      {
        id: "plan-1",
        name: goal,
        type: TaskType.GOAL,
      },
    ];
  }
}

export default HTNEngine;
