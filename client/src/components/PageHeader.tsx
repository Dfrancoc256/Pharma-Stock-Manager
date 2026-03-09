export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">{title}</h2>
        <p className="text-muted-foreground mt-1.5 text-lg">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
