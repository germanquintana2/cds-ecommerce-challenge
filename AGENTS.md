# Project conventions

These reflect how this codebase is actually built today. Follow them for new code; when you touch existing code that doesn't match, prefer matching the surrounding file over a drive-by rewrite.

## Server vs. Client Components

- Default to Server Components. Only add `"use client"` when the component actually needs interactivity — state, effects, event handlers, `useMutation`, hooks like `useRouter`/`useTransition`.
- Server Components read the session directly with `auth.api.getSession({ headers: await headers() })` (`~/lib/auth`) and fetch data directly with the tRPC **server caller** (`~/lib/trpc/server`), e.g. `await api.toDoItem.list()`. No hooks, no loading state — just `await`.
- Client Components never call the server caller or `auth.api` directly. They mutate/query through the tRPC **React** client (`~/lib/trpc/react`, e.g. `api.toDoItem.create.useMutation()`) and drive auth flows through `authClient` (`~/lib/auth/client`, from `better-auth/react`).
- Each async, data-fetching Server Component that lives in a route's `_components/` folder is wrapped in its own `<Suspense fallback={<Loading />}>` at the `page.tsx` level (see `dashboard/page.tsx`), so independent sections stream in on their own instead of blocking the whole page on the slowest fetch.
- Route protection is handled in `src/proxy.ts` (this Next.js version renamed `middleware.ts` → `proxy.ts` — see the breaking-changes note above), using `getSessionCookie` from `better-auth/cookies` plus `authRoutes`/`publicRoutes` allow-lists and an exported `matcher` config. Don't create a `middleware.ts`.

## tRPC

- Never query `prisma`/`ctx.db` directly outside of a tRPC procedure. Server Components go through the `api` server caller too, not straight through `~/lib/prisma`.
- Routers live under `src/server/api/routers/<router-name>/`, one file per procedure, kebab-case (e.g. `list-by-author.ts`, `count-by-author.ts`, `create.ts`), each exporting a single named `protectedProcedure`/`publicProcedure` chain.
- That folder's `index.ts` imports every procedure, re-exports each individually, and assembles the router with `createTRPCRouter({ ... })`. The key exposed to callers doesn't have to match the export/file name when the export name documents an implementation detail (e.g. `listByAuthor` is exposed as `list`).
- Register each feature router on `appRouter` in `src/server/api/root.ts`.
- Use `protectedProcedure` for anything scoped to the current user (it throws `UNAUTHORIZED` when there's no session); reach for `publicProcedure` only for genuinely public data.
- Always validate mutation/query input with a `zod` schema passed to `.input()`. On the client, reuse the same schema shape for the RHF `zodResolver` so client and server validation stay in sync.

## shadcn/ui components

- UI primitives are installed via the shadcn CLI into `src/components/ui/*.tsx` (style `base-nova`, base color `neutral`, icons from `lucide-react`), filenames kebab-case. There is no `~/app/_components/*` anymore — all shared UI primitives live under `~/components/ui/*`.
- Built on `@base-ui/react/*` primitives, variants via `class-variance-authority` (`cva`), and class merging via `cn()` from `~/lib/utils`. Extend a primitive through its `variant`/`size` slots and `className`, not by hand-editing its internal class strings.
- Compound components (`Dialog`, `Toast`) export each sub-part as a named export (`DialogTrigger`, `DialogContent`, `DialogHeader`, ...) and compose a trigger via the `render` prop (`<DialogTrigger render={<Button>...</Button>} />`), not children-as-trigger.

## Feature components

- Route-specific components are colocated in a `_components/` folder inside their route segment (`src/app/(group)/route/_components/`), kebab-case filenames — never in the shared `~/components` tree.
- Plain data-display Server Components (`items-list.tsx`, `dashboard-header.tsx`, `profile-details.tsx`) are `async function`s with no `"use client"`; they fetch their own data instead of receiving it as props.
- Interactive pieces (dialogs, forms, buttons that trigger mutations or client state) are `"use client"` and live next to their server sibling in the same `_components/` folder.
- `page.tsx`/`layout.tsx` use default exports (a Next.js requirement); most other components use named exports.

## Forms & mutations

- Forms use `react-hook-form` (`useForm`) with `zodResolver` from `@hookform/resolvers/zod`, validating against a `zod` schema declared next to the component.
- Field errors render through the shared `Input` component's `errorMessage` prop (`errors.<field>?.message`); a request-level failure that isn't tied to one field uses `setError("root", { message })` and a manual `errors.root` message block (see the login form).
- Mutations go through `api.<router>.<procedure>.useMutation()` (`~/lib/trpc/react`):
  - `onError` shows `toast.add({ title: error.message, type: "error" })` (`~/components/ui/toast`).
  - `onSuccess` runs its "after success" side effects (closing a dialog, `router.refresh()`) inside `startTransition` from `useTransition`. The submit button's `disabled` state and label account for both the mutation's `isPending` and the transition's pending flag. This keeps the current UI (e.g. an open dialog) on screen until the refreshed Server Component data has actually streamed in, instead of closing/flashing before the new data is visible.
- Non-tRPC submissions (e.g. `better-auth` sign-in/sign-out via `authClient`) follow the same shape: RHF `handleSubmit` wraps an async handler that awaits the client SDK call and routes success/failure explicitly (`router.push(...)` / `setError("root", ...)`).
- Format dates with `date-fns` (e.g. `format(item.createdAt, "d/M/yyyy")`) going forward, rather than `Intl`/`toLocaleString`.


<!-- BEGIN AWS Agent Toolkit rules -->
# AWS Guidance for the new AWS experience

This user has signed up for the new AWS experience. This experience lets you sign into AWS using a social provider and requires the following additional context.

Where this guidance conflicts with the project's own instructions, the project's instructions take precedence.

## Context

### Terminology:

- Say "project" instead of "account" — a project contains an AWS account and settings for sharing with other collaborators
- Say "team member" instead of "IAM user" — users are invited by email, not created or federated in IAM
- Say "AWS Settings" when referring to management tasks at [settings.aws.com](https://settings.aws.com/) (project management, billing, team members, spend limits). Users view their actual AWS resources in the AWS Management Console.
- Say "selected Region" when referring to the user's Region — not "home Region"
- The user has a managed IAM experience. This includes a managed service control policies (SCP) and resource control policies (RCP) that govern the use of AWS. They will still need to use IAM to create policies to let services work with each other. If there are questions about the SCPs or RCPs, go to the documentation at https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html

### Constraints:

- All projects share a single AWS Region determined by the user's contact address. Resources cannot be created in other Regions
- When developing:
  - MUST create all Regional resources in the project's assigned Region
  - You CAN create AWS WAF and Cloudwatch Logs resources in us-east-1 when there are global resources (like a global WAF instance) that require a connection to dependencies in us-east-1. You should not use these for any other reason, because resources in the selected Region will provide lower cost (due to no cross-Region traffic), increased availability (due to no cross-Region traffic), and easier manageability (due to not needing to look in another Region). When you need to do an inventory of resources, you need to look in both the selected Region and us-east-1 for Cloudwatch Logs or WAF resources.
  - MUST NOT attempt to create Lambda, API Gateway, or other Regional resources in any other Region
  - MUST direct users to confirm their Region in AWS Settings > View all projects > Overview > Additional Info > Region. If the user cannot confirm their Region, check in ~/.aws/config
  - MUST NOT use Lambda@Edge — excluded from both Lambda and CloudFront
  - MUST NOT use CloudFormation StackSets — no multi-account or multi-Region deployments
  - MUST NOT attempt cross-Region actions — no cross-Region replication for DynamoDB/S3/RDS, no multi-Region KMS keys
  - MUST NOT use Route 53 cross-Region routing — geolocation, latency-based, and failover routing policies are not available
  - CloudFront is a global service and its actions ARE allowed in `us-east-1`. A user can create a CloudFront distribution pointing to their project-region Lambda function URL or API Gateway. However, Lambda and API Gateway themselves MUST NOT be created in `us-east-1` — they must be in the project Region.
  - Reduced availability in `eu-north-1` specifically: Amazon Rekognition, Amazon Textract, Amazon Personalize, AWS App Runner are not available in that Region.
- IAM permissions for human access are managed by AWS. Don't assign roles to team members unless absolutely necessary
- The user may have a spend limit if they are on the paid plan. The limit that pauses their project if it's exceeded. If resources suddenly become inaccessible, ask if they have a spend limit configured. Only project owners can modify a spend limit.
- When developing:
  - MUST ask about spend limit status if the user reports sudden "Access Denied" errors on operations that previously worked
  - MUST direct users to check spend status in AWS Settings > Billing
  - MUST check if a user has upgraded their account to the paid plan
  - MUST ask the user if they want to clean up the successfully created resources or keep them to reduce cost
- The user sets up billing, creates spend limits, and retrieves and pays invoices in AWS Settings. The user creates budgets and optimizes their costs in the AWS Billing and Cost Management console
- Not all AWS services are available. If a service isn't working, do the following:
  1. Run the command `aws freetier get-account-plan-state`
  2. If accountPlanType": "FREE", check the [Free Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-free-tier) next,
  3. If accountPlanType": "PAID", check the [Paid Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-paid-plan).
  4. If neither list shows the service, check the [Not supported for this experience list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#unsupported-services). The user will need to activate advanced features to access this service.
- Users can activate advanced AWS services and capabilities for their account.
- Before starting a task, check whether a relevant AWS skill is available. Load the skill with retrieve_skill and prefer its guidance over general knowledge.

### Help level

- help_level (required): LOW, MEDIUM, or HIGH. While a user is building, you MUST ask the user: "How much guidance would you like from me? Low (I only flag security risks), medium (I ask a couple of clarifying questions if something seems off), or high (I explain what I'm doing, suggest alternatives, and flag best practices)."

You CAN update this rule file to save a user's help_level.

Constraints for each level:

**LOW:**

- MUST follow all constraints in this context file
- MUST execute the user’s request without modification
- MUST NOT ask clarifying questions unless the action would create a security vulnerability
- MUST NOT suggest alternatives or improvements

**MEDIUM:**

- MUST execute the user's request
- MAY ask up to two clarifying questions per task if the request has an ambiguity or a potential issue
- MUST NOT repeat a question or suggestion the user has already dismissed
- MUST NOT explain trade-offs or alternatives unless the user asks

**HIGH:**

- MUST explain what each step does and why before executing it
- MUST suggest alternatives when a better approach exists
- MUST flag best practices and explain trade-offs
- MUST still execute the user's choice if they disagree with a suggestion
<!-- END AWS Agent Toolkit rules -->

AWS help_level: HIGH (explain steps, alternatives, and best practices).
