# Gustav - Plateforme de Gestion

Gustav est une application SaaS interne de gestion de soumissions, projets et planification, propulsée par Next.js et Supabase.

## 🚀 Fonctionnalités
- **Clients** : Gestion des clients (CRUD, Import Excel).
- **Soumissions** : Création avancée de soumissions avec calculs financiers et upload d'images.
- **Facturation/PDF** : Génération de PDF professionnels pour les soumissions.
- **Workflow** : Approbation des soumissions (création automatique de projets).
- **Planification** : Calendrier interactif FullCalendar (Drag-and-Drop).
- **Analytiques** : Tableau de bord & KPI via Recharts.

## 🛠️ Stack Technique
- **Framework:** Next.js 15 (App Router, Server Actions)
- **UI:** Tailwind CSS, shadcn/ui, Recharts
- **Formulaires:** React Hook Form + Zod
- **Backend / BDD:** Supabase (PostgreSQL, SSR Auth, Storage)
- **Utilitaires:** FullCalendar, xlsx, jsPDF + html2canvas

## 📋 Prérequis et Installation locale

1. Cloner le projet et installer les dépendances:
```bash
npm install
```

2. Configuration de Supabase :
  - Créer un projet sur [Supabase](https://supabase.com).
  - Allez dans le **SQL Editor** et exécutez le script `/supabase/migrations/0000_initial_schema.sql`.
  - Activez l'authentification par courriel/mot de passe.
  - Allez dans **Storage** et créez un Bucket public nommé `quote-images`.

3. Variables d'environnement :
  Modifiez le fichier `.env.local` avec vos clés :
```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon_supabase
```

4. Lancer le serveur local :
```bash
npm run dev
```

## 🚀 Déploiement sur Vercel

1. Pousser votre code source sur un dépôt GitHub.
2. Connectez-vous à [Vercel](https://vercel.com) et cliquez sur **Add New Project**.
3. Importez votre dépôt `gustav`.
4. Dans **Environment Variables**, ajoutez :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Cliquez sur **Deploy**.
# Laucandrique
