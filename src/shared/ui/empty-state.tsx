type EmptyStateProps = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
