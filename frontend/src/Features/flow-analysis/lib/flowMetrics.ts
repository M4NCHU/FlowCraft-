import {
  EmployeeSkillLevel,
  EmployeeStatus,
  type EmployeeDto,
} from "../../employees/api/contracts";

export interface FlowSkillCoverageItem {
  assetCategoryId: string;
  assetCategoryName: string;
  totalPeople: number;
  operatorsCount: number;
  maintainersCount: number;
  advancedCount: number;
}

export interface FlowMetricsSummary {
  activeEmployees: number;
  availableEmployees: number;
  maintainersCount: number;
  operatorsCount: number;
  trainersCount: number;
  categoriesCovered: number;
  coverage: FlowSkillCoverageItem[];
}

export function calculateFlowMetrics(
  employees: EmployeeDto[],
): FlowMetricsSummary {
  const activeEmployees = employees.filter((employee) => employee.isActive);
  const availableEmployees = activeEmployees.filter(
    (employee) => employee.status === EmployeeStatus.Active,
  );
  const maintainersCount = activeEmployees.filter((employee) =>
    employee.skills.some((skill) => skill.canMaintain),
  ).length;
  const operatorsCount = activeEmployees.filter((employee) =>
    employee.skills.some((skill) => skill.canOperate),
  ).length;
  const trainersCount = activeEmployees.filter((employee) =>
    employee.skills.some((skill) => skill.skillLevel === EmployeeSkillLevel.Trainer),
  ).length;

  const byCategory = new Map<string, FlowSkillCoverageItem>();

  for (const employee of activeEmployees) {
    for (const skill of employee.skills) {
      const existing = byCategory.get(skill.assetCategoryId) ?? {
        assetCategoryId: skill.assetCategoryId,
        assetCategoryName: skill.assetCategoryName,
        totalPeople: 0,
        operatorsCount: 0,
        maintainersCount: 0,
        advancedCount: 0,
      };

      existing.totalPeople += 1;
      if (skill.canOperate) existing.operatorsCount += 1;
      if (skill.canMaintain) existing.maintainersCount += 1;
      if (
        skill.skillLevel === EmployeeSkillLevel.Advanced ||
        skill.skillLevel === EmployeeSkillLevel.Trainer
      ) {
        existing.advancedCount += 1;
      }

      byCategory.set(skill.assetCategoryId, existing);
    }
  }

  return {
    activeEmployees: activeEmployees.length,
    availableEmployees: availableEmployees.length,
    maintainersCount,
    operatorsCount,
    trainersCount,
    categoriesCovered: byCategory.size,
    coverage: [...byCategory.values()].sort((left, right) =>
      left.assetCategoryName.localeCompare(right.assetCategoryName, "pl"),
    ),
  };
}
