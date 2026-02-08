import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useResearchStore } from '../store';
import { Terminal, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';

export const Signup = () => {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup, authError, clearAuthError, isAuthenticated } = useResearchStore();
    const navigate = useNavigate();

    useEffect(() => {
        clearAuthError();
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [clearAuthError, isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signup(email, password, username);
        } catch (e) {
            // Handled in store
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center text-center">
                    <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center mb-4">
                        <Terminal className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Create an account</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                        Start your research journey today
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Sign up</CardTitle>
                        <CardDescription>
                            Enter your information to create an account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {authError && (
                            <div className="mb-4 p-3 rounded-md bg-destructive/15 text-destructive text-sm flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                <span>{authError}</span>
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="username">
                                    Full Name
                                </label>
                                <Input
                                    id="username"
                                    placeholder="John Doe"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="email">
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="password">
                                    Password
                                </label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    minLength={6}
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Must be at least 6 characters
                                </p>
                            </div>
                            <Button type="submit" className="w-full" isLoading={loading}>
                                Create Account
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-center border-t p-4">
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-primary hover:underline">
                                Log in
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};