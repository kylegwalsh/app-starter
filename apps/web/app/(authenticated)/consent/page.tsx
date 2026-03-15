'use client';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/design';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { auth } from '@/core/auth';

/** OAuth consent page for MCP and third-party clients */
export default function ConsentPage() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client_id');
  const scope = searchParams.get('scope');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');
  const responseType = searchParams.get('response_type');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const scopes = scope?.split(' ').filter(Boolean) ?? [];

  // If missing required params, show error
  useEffect(() => {
    if (!clientId || !redirectUri) {
      setError('Missing required authorization parameters.');
    }
  }, [clientId, redirectUri]);

  const handleConsent = useCallback(
    async (accept: boolean) => {
      if (!clientId || !redirectUri) {
        return;
      }

      setIsLoading(true);
      try {
        // Call Better Auth's consent endpoint
        const response = await auth.oauth2.consent({
          accept,
          clientId,
          scope: scope ?? '',
          redirectUri,
          state: state ?? '',
          codeChallenge: codeChallenge ?? '',
          codeChallengeMethod: codeChallengeMethod ?? 'S256',
          responseType: responseType ?? 'code',
        });

        // Better Auth should redirect automatically, but handle the response URL if returned
        if (response?.data?.redirectURI) {
          window.location.href = response.data.redirectURI;
        }
      } catch {
        setError('Failed to process authorization request.');
        setIsLoading(false);
      }
    },
    [clientId, scope, redirectUri, state, codeChallenge, codeChallengeMethod, responseType],
  );

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authorization Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authorize Application</CardTitle>
          <CardDescription>An application is requesting access to your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Application ID</p>
            <p className="text-muted-foreground text-sm">{clientId}</p>
          </div>
          {scopes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Requested permissions</p>
              <ul className="space-y-1">
                {scopes.map((s) => (
                  <li key={s} className="text-muted-foreground text-sm">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button
            className="flex-1"
            disabled={isLoading}
            variant="outline"
            onClick={() => handleConsent(false)}
          >
            Deny
          </Button>
          <Button className="flex-1" disabled={isLoading} onClick={() => handleConsent(true)}>
            {isLoading ? 'Authorizing...' : 'Authorize'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
