import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, X, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

type Plan = {
    name: string;
    price: string;
    period: string;
    description: string;
    cta: string;
    ctaHref: string;
    featured: boolean;
    features: { text: string; included: boolean }[];
};

const PLANS: Plan[] = [
    {
        name: 'Free',
        price: '$0',
        period: '/month',
        description: 'Perfect for getting started and exploring the platform.',
        cta: 'Get Started Free',
        ctaHref: '/login',
        featured: false,
        features: [
            { text: '5 research sessions per month', included: true },
            { text: 'Standard 5-stage pipeline', included: true },
            { text: 'Markdown & PDF export', included: true },
            { text: '3 search providers', included: true },
            { text: 'Chat with research assistant', included: true },
            { text: 'Workspace file uploads', included: false },
            { text: 'LaTeX & ZIP export', included: false },
            { text: 'Full 7-stage deep pipeline', included: false },
            { text: 'Priority support', included: false },
        ],
    },
    {
        name: 'Pro',
        price: '$29',
        period: '/month',
        description: 'For researchers and professionals who need depth and speed.',
        cta: 'Start 7-Day Trial',
        ctaHref: '/login',
        featured: true,
        features: [
            { text: 'Unlimited research sessions', included: true },
            { text: 'Full 7-stage deep pipeline', included: true },
            { text: 'All 5 export formats', included: true },
            { text: 'All 6 search providers', included: true },
            { text: 'Chat with research assistant', included: true },
            { text: 'Workspace file uploads (10 GB)', included: true },
            { text: 'LaTeX & ZIP export', included: true },
            { text: '29 specialized agents', included: true },
            { text: 'Priority support', included: true },
        ],
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        description: 'For institutions, teams, and high-volume research workflows.',
        cta: 'Contact Sales',
        ctaHref: 'mailto:sales@deepresearch.ai',
        featured: false,
        features: [
            { text: 'Everything in Pro', included: true },
            { text: 'Unlimited team seats', included: true },
            { text: 'Self-hosted deployment option', included: true },
            { text: 'Custom LLM provider integration', included: true },
            { text: 'SSO / SAML authentication', included: true },
            { text: 'Dedicated SLA & uptime guarantee', included: true },
            { text: 'Audit logs and compliance export', included: true },
            { text: 'Volume discounts', included: true },
            { text: 'Dedicated account manager', included: true },
        ],
    },
];

const FAQ = [
    {
        q: 'Is there a free tier?',
        a: 'Yes — the Free plan never expires and gives you 5 research sessions per month with no credit card required.',
    },
    {
        q: 'What happens if I exceed my session limit?',
        a: 'You will be prompted to upgrade. No sessions are lost; they simply queue until the next billing cycle or an upgrade.',
    },
    {
        q: 'Can I cancel anytime?',
        a: 'Yes. You can cancel or downgrade from the account settings page at any time. No lock-in.',
    },
    {
        q: 'Do you support self-hosting?',
        a: 'Enterprise customers can deploy the full platform on their own infrastructure. Contact sales for details.',
    },
    {
        q: 'Which LLMs power the agents?',
        a: 'We support Groq, Gemini, OpenRouter, and local Ollama models. The platform switches automatically based on availability.',
    },
];

export const PricingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-bg text-text-c font-sans">

            {/* Header */}
            <header className="fixed top-0 w-full z-50 border-b border-border-c bg-bg/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                    <Link to="/" className="font-bold font-display text-xl tracking-tight text-accent">DeepResearch</Link>
                    <nav className="hidden md:flex gap-6 text-sm font-medium text-text-sec">
                        <Link to="/features" className="hover:text-accent transition-colors">Features</Link>
                        <Link to="/pricing" className="text-accent">Pricing</Link>
                        <Link to="/docs" className="hover:text-accent transition-colors">Docs</Link>
                    </nav>
                    <div className="flex items-center gap-3">
                        <ThemeSwitcher />
                        <Link to="/login"><Button size="sm">Get Started</Button></Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="pt-36 pb-16 px-4 text-center">
                <div className="max-w-3xl mx-auto space-y-5">
                    <h1 className="text-5xl md:text-6xl font-bold font-display tracking-tight text-text-c">
                        Simple, transparent <span className="text-accent italic">pricing</span>
                    </h1>
                    <p className="text-xl text-text-sec">
                        Start free and scale when your research demands it. No hidden fees.
                    </p>
                </div>
            </section>

            {/* Plans */}
            <section className="pb-24 px-4">
                <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 items-start">
                    {PLANS.map((plan) => (
                        <div
                            key={plan.name}
                            className={`rounded-2xl border p-8 flex flex-col gap-6 ${plan.featured
                                    ? 'border-accent bg-accent/5 ring-1 ring-accent/20'
                                    : 'border-border-c bg-surface'}`}
                        >
                            {plan.featured && (
                                <div className="text-center">
                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent text-white">Most Popular</span>
                                </div>
                            )}
                            <div>
                                <div className="text-sm font-semibold text-text-sec uppercase tracking-wider mb-2">{plan.name}</div>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-4xl font-bold font-display text-text-c">{plan.price}</span>
                                    {plan.period && <span className="text-text-sec text-sm">{plan.period}</span>}
                                </div>
                                <p className="text-sm text-text-sec">{plan.description}</p>
                            </div>
                            <ul className="space-y-3 flex-1">
                                {plan.features.map((f) => (
                                    <li key={f.text} className={`flex items-center gap-2.5 text-sm ${f.included ? 'text-text-c' : 'text-text-sec line-through opacity-50'}`}>
                                        {f.included
                                            ? <CheckCircle2 className="h-4 w-4 text-teal flex-shrink-0" />
                                            : <X className="h-4 w-4 text-text-sec flex-shrink-0" />
                                        }
                                        {f.text}
                                    </li>
                                ))}
                            </ul>
                            <Link to={plan.ctaHref}>
                                <Button
                                    className="w-full"
                                    variant={plan.featured ? 'default' : 'secondary'}
                                >
                                    {plan.cta} {plan.featured && <ArrowRight className="ml-2 h-4 w-4" />}
                                </Button>
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            {/* Feature Comparison Table */}
            <section className="py-20 px-4 bg-bg-sec border-t border-border-c">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold font-display text-text-c text-center mb-10">Feature Comparison</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border-c">
                                    <th className="pb-4 text-left text-text-sec font-medium">Feature</th>
                                    <th className="pb-4 text-center text-text-c font-semibold">Free</th>
                                    <th className="pb-4 text-center text-accent font-semibold">Pro</th>
                                    <th className="pb-4 text-center text-text-c font-semibold">Enterprise</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-c">
                                {[
                                    ['Monthly sessions', '5', 'Unlimited', 'Unlimited'],
                                    ['Pipeline stages', '5', '7', '7+'],
                                    ['Search providers', '3', '6', '6+'],
                                    ['Export formats', 'MD + PDF', 'All 5', 'All 5'],
                                    ['File uploads', '—', '10 GB', 'Custom'],
                                    ['Agents', '15', '29', '29+'],
                                    ['Priority queue', '✗', '✓', '✓'],
                                    ['SSO / SAML', '✗', '✗', '✓'],
                                    ['Self-hosted', '✗', '✗', '✓'],
                                ].map(([feature, free, pro, ent]) => (
                                    <tr key={feature}>
                                        <td className="py-3 text-text-c">{feature}</td>
                                        <td className="py-3 text-center text-text-sec">{free}</td>
                                        <td className="py-3 text-center text-accent font-medium">{pro}</td>
                                        <td className="py-3 text-center text-text-sec">{ent}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20 px-4 bg-bg">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold font-display text-text-c text-center mb-10">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        {FAQ.map((item) => (
                            <div key={item.q} className="bg-surface border border-border-c rounded-xl p-6">
                                <h3 className="font-semibold text-text-c mb-2">{item.q}</h3>
                                <p className="text-sm text-text-sec leading-relaxed">{item.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-4 text-center bg-bg-sec border-t border-border-c">
                <div className="max-w-xl mx-auto space-y-5">
                    <h2 className="text-3xl font-bold font-display text-text-c">Start for free today</h2>
                    <p className="text-text-sec">No credit card required. Upgrade whenever you're ready.</p>
                    <Link to="/login">
                        <Button size="lg" className="px-10">Create Free Account <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </Link>
                </div>
            </section>

            <footer className="border-t border-border-c py-8 bg-bg text-center text-sm text-text-sec">
                &copy; {new Date().getFullYear()} DeepResearch &middot;{' '}
                <Link to="/features" className="hover:text-accent">Features</Link>{' '}·{' '}
                <Link to="/pricing" className="hover:text-accent">Pricing</Link>{' '}·{' '}
                <Link to="/docs" className="hover:text-accent">Docs</Link>
            </footer>
        </div>
    );
};
