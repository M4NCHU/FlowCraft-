type Props = { title: string; extra?: React.ReactNode };
export function PageHeader({ title, extra }: Props) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {extra}
    </div>
  );
}
