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
import { useQuery } from '@tanstack/react-query';
import { Loader2, ShieldCheckIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { AuthorizeSkeleton } from '@/components';
import { auth } from '@/core';

/** OAuth consent page for MCP and third-party clients */
export default function AuthorizePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client_id');
  const scope = searchParams.get('scope');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  // Check session
  const { data: session, isPending: isSessionPending } = auth.useSession();

  // Fetch client app info via react-query
  const { data: clientInfo, isLoading: isClientLoading } = useQuery({
    queryKey: ['oauth-client', clientId],
    queryFn: async () => {
      if (!clientId) {
        return null;
      }

      const { data } = await auth.oauth2.publicClient({ query: { client_id: clientId } });
      if (!data) {
        return null;
      }

      return {
        name: data.client_name ?? clientId,
        icon: data.logo_uri ?? null,
      };
    },
    enabled: !!clientId && !!session,
  });

  // If not authenticated, redirect to sign-in (preserving consent params for return)
  useEffect(() => {
    if (isSessionPending || session) {
      return;
    }

    const redirectTo = window.location.pathname + window.location.search;
    router.replace(`/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`);
  }, [isSessionPending, session, router]);

  /**
   * Submit consent decision to better-auth — the oauthProviderClient fetch plugin
   * automatically attaches the signed OAuth query from window.location.search
   */
  const handleConsent = useCallback(
    async (accept: boolean) => {
      setIsSubmitting(true);
      setError(undefined);

      try {
        const { data } = await auth.oauth2.consent({
          accept,
          scope: scope ?? undefined,
        });

        // Redirect to the client's redirect URI
        if (data?.redirect && data.url) {
          window.location.href = data.url;
        }
        // If the response is not a redirect, set an error
        else {
          setError('Unexpected response from authorization server.');
          setIsSubmitting(false);
        }
      } catch {
        setError('Failed to process authorization request.');
        setIsSubmitting(false);
      }
    },
    [scope],
  );

  // Show skeleton while session or client info is loading
  if (isSessionPending || !session || isClientLoading) {
    return (
      <main className="container flex grow flex-col items-center justify-center self-center p-0">
        <AuthorizeSkeleton />
      </main>
    );
  }

  return (
    <main className="container flex grow flex-col items-center justify-center self-center p-0">
      <Card className="w-full max-w-sm">
        <CardHeader className="justify-items-center text-center">
          {clientInfo?.icon ? (
            <Image
              src={clientInfo.icon}
              alt={clientInfo.name}
              width={48}
              height={48}
              className="size-12 rounded-lg"
            />
          ) : (
            <div className="bg-muted flex size-12 items-center justify-center rounded-lg">
              <ShieldCheckIcon className="text-muted-foreground size-6" />
            </div>
          )}

          <CardTitle className="text-lg md:text-xl">Authorize Application</CardTitle>

          <CardDescription className="text-xs md:text-sm">
            {clientInfo?.name ? (
              <>
                <span className="text-foreground font-medium">{clientInfo.name}</span> is requesting
                access to your account and organization data.
              </>
            ) : (
              'An application is requesting access to your account and organization data'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="grid gap-2">
            <Button disabled={isSubmitting} onClick={() => handleConsent(true)}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Authorize'}
            </Button>
            <Button disabled={isSubmitting} variant="outline" onClick={() => handleConsent(false)}>
              Deny
            </Button>
          </div>
        </CardContent>

        {session.user?.email && (
          <CardFooter className="text-muted-foreground justify-center text-xs">
            <span>Signed in as {session.user.email}</span>
          </CardFooter>
        )}
      </Card>
    </main>
  );
}
