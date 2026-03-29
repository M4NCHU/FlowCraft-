import {
  AssetParameterType,
  type AssetCategoryParameterDto,
} from "../../api/contracts";

type Props = {
  parameters: AssetCategoryParameterDto[];
  values: Record<string, string>;
  onChange: (parameterId: string, value: string) => void;
  disabled?: boolean;
  emptyText?: string;
};

export function MachineParameterFormFields({
  parameters,
  values,
  onChange,
  disabled = false,
  emptyText = "Wybrana kategoria nie definiuje dodatkowych parametr?w.",
}: Props) {
  if (parameters.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {parameters.map((parameter) => {
        const value =
          values[parameter.id] ?? parameter.value ?? parameter.defaultValue ?? "";
        const label = parameter.unit
          ? `${parameter.name} (${parameter.unit})`
          : parameter.name;

        return (
          <div key={parameter.id} className="flex flex-col gap-1">
            <label className="text-sm text-slate-600">
              {label}
              {parameter.isRequired ? (
                <span className="text-rose-600"> *</span>
              ) : null}
            </label>

            {parameter.type === AssetParameterType.Select ? (
              <select
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(parameter.id, event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:bg-slate-100"
              >
                <option value="">Wybierz</option>
                {parameter.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : null}

            {parameter.type === AssetParameterType.Boolean ? (
              <select
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(parameter.id, event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:bg-slate-100"
              >
                <option value="">Wybierz</option>
                <option value="true">Tak</option>
                <option value="false">Nie</option>
              </select>
            ) : null}

            {parameter.type !== AssetParameterType.Select &&
            parameter.type !== AssetParameterType.Boolean ? (
              <input
                type={
                  parameter.type === AssetParameterType.Number ? "number" : "text"
                }
                step={parameter.type === AssetParameterType.Number ? "0.01" : undefined}
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(parameter.id, event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:bg-slate-100"
                placeholder={parameter.defaultValue ?? undefined}
              />
            ) : null}

            <div className="text-xs text-slate-500">
              Kod: {parameter.code}
              {parameter.defaultValue
                ? ` ? Domyslnie: ${parameter.defaultValue}`
                : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}
