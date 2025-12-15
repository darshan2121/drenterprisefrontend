export default function AdminLoading() {
  return (
    <div className="flex justify-center items-center min-h-[200px] px-4">
      <div className="flex flex-col items-center space-y-2">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

