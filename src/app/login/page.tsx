import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LoginPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedSearchParams = await searchParams;
    const error = resolvedSearchParams.error as string | undefined;
    const message = resolvedSearchParams.message as string | undefined;

    return (
        <div className="flex h-screen w-full items-center justify-center bg-zinc-950 px-4">
            <Card className="w-full max-w-sm border-zinc-800 bg-zinc-900 text-zinc-100 shadow-2xl">
                <form action={login}>
                    <CardHeader>
                        <CardTitle className="text-2xl text-center font-bold tracking-tight">Gustav</CardTitle>
                        <CardDescription className="text-center text-zinc-400">
                            Connexion au portail employé
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-zinc-300">Courriel</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="nom@entreprise.com"
                                required
                                className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-600"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-zinc-300">Mot de passe</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="border-zinc-700 bg-zinc-800 text-zinc-100 focus-visible:ring-zinc-600"
                            />
                        </div>
                        {error && (
                            <p className="mt-4 p-3 bg-red-950/50 text-red-400 text-center text-sm border border-red-900/50 rounded-md">
                                {error}
                            </p>
                        )}
                        {message && (
                            <p className="mt-4 p-3 bg-zinc-800/50 text-zinc-300 text-center text-sm border border-zinc-700 rounded-md">
                                {message}
                            </p>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                            Se connecter
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
