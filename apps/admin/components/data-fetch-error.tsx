import { Alert, AlertDescription, Button } from '@repo/design';
import { AlertCircleIcon, RefreshCwIcon } from 'lucide-react';

export const DataFetchError = ({
  title,
  description,
  onRetry,
  error,
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
  error?: string;
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>

      <div className="flex items-center justify-center py-8">
        <div className="w-full max-w-xl text-center">
          <Alert variant="destructive" className="p-10">
            <div className="flex flex-col items-center gap-5">
              <div className="bg-destructive/10 flex h-20 w-20 items-center justify-center rounded-full">
                <AlertCircleIcon className="text-destructive h-10 w-10" />
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-bold">Failed to Load Data</h2>
                <AlertDescription className="text-muted-foreground mx-auto max-w-md">
                  {error ||
                    'An error occurred while fetching the data. Please try again or contact support if the problem persists.'}
                </AlertDescription>
              </div>

              {onRetry && (
                <Button variant="destructive" onClick={onRetry}>
                  <RefreshCwIcon className="h-4 w-4" />
                  Try Again
                </Button>
              )}
            </div>
          </Alert>
        </div>
      </div>
    </div>
  );
};
