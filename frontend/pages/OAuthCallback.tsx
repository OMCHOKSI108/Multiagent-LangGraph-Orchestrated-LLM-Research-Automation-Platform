import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useResearchStore } from '../store';
import { Loader2 } from 'lucide-react';

export const OAuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    // We access the Zustand store directly to set the token without needing an email/password
    useEffect(() => {
        if (!token) {
            navigate('/login?error=no_token_provided');
            return;
        }

        const handleOAuthLogin = async () => {
            try {
                // Save the token locally just like the normal login flow does
                localStorage.setItem('dre_token', token);

                // Trigger rehydration to fetch the user profile and establish the session
                await useResearchStore.getState().rehydrateAuth();

                navigate('/workspaces');
            } catch (error) {
                console.error('Failed to validate OAuth token:', error);
                localStorage.removeItem('dre_token');
                navigate('/login?error=oauth_validation_failed');
            }
        };

        handleOAuthLogin();
    }, [token, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
            <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <h2 className="text-xl font-medium">Authenticating...</h2>
                <p className="text-sm text-muted-foreground">Please wait while we log you in securely.</p>
            </div>
        </div>
    );
};
