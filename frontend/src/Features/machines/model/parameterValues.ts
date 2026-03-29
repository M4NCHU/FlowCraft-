import type {
  AssetCategoryParameterDto,
  SetAssetParameterValueRequest,
} from "../api/contracts";

function normalizeParameterValue(value?: string | null) {
  return value?.trim() ?? "";
}

export function buildMachineParameterValueMap(
  parameters: AssetCategoryParameterDto[]
): Record<string, string> {
  return Object.fromEntries(
    parameters.map((parameter) => [
      parameter.id,
      parameter.value ?? parameter.defaultValue ?? "",
    ])
  );
}

export function buildMachineParameterPayload(
  parameters: AssetCategoryParameterDto[],
  values: Record<string, string>
): SetAssetParameterValueRequest[] {
  return parameters.map((parameter) => ({
    parameterDefinitionId: parameter.id,
    value: normalizeParameterValue(values[parameter.id]) || null,
  }));
}

export function haveMachineParameterValuesChanged(
  parameters: AssetCategoryParameterDto[],
  values: Record<string, string>
) {
  return parameters.some((parameter) => {
    const currentValue = normalizeParameterValue(
      parameter.value ?? parameter.defaultValue
    );
    const nextValue = normalizeParameterValue(values[parameter.id]);

    return currentValue !== nextValue;
  });
}

export function findMissingRequiredMachineParameter(
  parameters: AssetCategoryParameterDto[],
  values: Record<string, string>
) {
  return (
    parameters.find((parameter) => {
      if (!parameter.isRequired) {
        return false;
      }

      const value = normalizeParameterValue(
        values[parameter.id] ?? parameter.value ?? parameter.defaultValue
      );

      return value.length === 0;
    }) ?? null
  );
}
