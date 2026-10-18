import '../utils/supabase/dnsPin';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPath = fs.existsSync(path.resolve(process.cwd(), '.env.local'))
  ? path.resolve(process.cwd(), '.env.local')
  : path.resolve(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

if (typeof (global as any).WebSocket === 'undefined') {
  (global as any).WebSocket = class {};
}
const client = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log('Seeding published book in staging...');

  // Check if book already exists
  const { data: existing } = await client
    .from('ebooks')
    .select('id, title')
    .eq('slug', 'mastering-microservices-architecture')
    .maybeSingle();

  if (existing) {
    console.log('Book already exists in staging:', existing.title);
  } else {
    // Create book
    const { data: book, error: bErr } = await client
      .from('ebooks')
      .insert({
        title: 'Mastering Microservices Architecture',
      slug: 'mastering-microservices-architecture',
      subtitle: 'Designing Resilient, High-Throughput Distributed Systems',
      author: 'KnowledgePaat Technical Editorial',
      description: 'An authoritative engineering guide covering domain decomposition, event-driven messaging, transaction saga patterns, and distributed consensus. Designed for software engineers preparing for senior backend and system design roles.',
      category: 'System Design',
      reader_role: 'Backend Engineers & System Architects',
      language: 'en',
      status: 'published',
    })
    .select('id')
    .single();

  if (bErr || !book) {
    console.error('Error creating book:', bErr);
    return;
  }

  // Create edition 1
  const { data: edition, error: eErr } = await client
    .from('ebook_editions')
    .insert({
      ebook_id: book.id,
      edition_number: 1,
      version_name: 'First Edition',
      status: 'published',
      is_current_edition: true,
      price_read_online_paise: 4900,
      price_read_download_paise: 9900,
      price_upgrade_pdf_paise: 5000,
      page_count: 285,
      pdf_storage_path: 'private/sample_mastering_microservices.pdf',
      pdf_checksum: 'sha256_mock_checksum_edition_1',
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (eErr || !edition) {
    console.error('Error creating edition:', eErr);
    return;
  }

  // Create Chapter 1 (Free sample)
  await client.from('ebook_chapters').insert({
    ebook_id: book.id,
    edition_id: edition.id,
    chapter_index: 1,
    title: 'Domain Decomposition & Service Boundaries',
    slug: 'domain-decomposition-and-service-boundaries',
    content_body: `# Domain Decomposition & Service Boundaries

Modern enterprise software systems demand agility, independent deployability, and high resilience. This chapter establishes the architectural framework for breaking monolithic structures into cohesive bounded contexts.

## 1. The Fallacy of Arbitrary Microservices

Splitting services based strictly on technical layers (e.g. database-as-a-service, auth-as-a-service) often amplifies network latency and couples components tighter together. True microservices must map directly to **business capabilities** and distinct ubiquitous languages.

### Key Architectural Guidelines
- **Single Responsibility Principle at Scale**: A service should have only one reason to change from a business domain perspective.
- **Autonomous Data Ownership**: Under no circumstances should two independent microservices directly query or mutate the same underlying database schema.
- **Fail Gracefully**: Every inter-service network call must incorporate explicit timeouts, retries with exponential backoff, and circuit breakers.

> "If you cannot build a well-structured monolith, what makes you think microservices will solve your problems?" — Martin Fowler

## 2. Event-Driven Loose Coupling

Synchronous REST or gRPC HTTP calls between deeply nested service graphs create cascading latency failures. Asynchronous event streams using durable message brokers (such as Apache Kafka or RabbitMQ) invert dependencies and decouple upstream publishers from downstream consumers.

\`\`\`typescript
interface OrderPlacedEvent {
  orderId: string;
  customerId: string;
  totalPaise: number;
  occurredAt: string;
}
\`\`\`

In the next sections, we explore the Saga pattern for managing distributed transactions across independent service boundaries.`,
    word_count: 750,
    status: 'ready',
    is_free_sample: true,
  });

  // Create Chapter 2 (Paid chapter)
  await client.from('ebook_chapters').insert({
    ebook_id: book.id,
    edition_id: edition.id,
    chapter_index: 2,
    title: 'Distributed Transactions & The Saga Pattern',
    slug: 'distributed-transactions-and-saga-pattern',
    content_body: 'PAID PURCHASERS ONLY: Full chapter text covering Choreography vs Orchestration Sagas, compensating transactions, and idempotency keys.',
    word_count: 1280,
    status: 'ready',
    is_free_sample: false,
  });

  // Create Chapter 3 (Paid chapter)
  await client.from('ebook_chapters').insert({
    ebook_id: book.id,
    edition_id: edition.id,
    chapter_index: 3,
    title: 'Resilience Patterns: Bulkheads, Circuit Breakers & Observability',
    slug: 'resilience-patterns-bulkheads-circuit-breakers',
    content_body: 'PAID PURCHASERS ONLY: Full chapter text covering OpenTelemetry distributed tracing, Prometheus SLI/SLO metrics, and automated chaos engineering.',
    word_count: 1540,
    status: 'ready',
    is_free_sample: false,
  });
  console.log('✅ Book 1 seeded successfully.');
}
  console.log('✅ Book 1 verified: Mastering Microservices Architecture');

  // Book 2: Cloud System Architecture & DevOps Handbook
  const { data: existing2 } = await client
    .from('ebooks')
    .select('id, title')
    .eq('slug', 'cloud-system-architecture-devops')
    .maybeSingle();

  if (!existing2) {
    const { data: book2, error: bErr2 } = await client
      .from('ebooks')
      .insert({
        title: 'Cloud System Architecture & DevOps Handbook',
        slug: 'cloud-system-architecture-devops',
        subtitle: 'Production Kubernetes, GitOps, and Cloud-Native Resilience',
        author: 'KnowledgePaat Cloud Practice',
        description: 'A comprehensive, hands-on engineering guide to automated CI/CD pipelines, container orchestration with Kubernetes, infrastructure as code with Terraform, and zero-trust cloud security architectures.',
        category: 'DevOps & Cloud',
        reader_role: 'DevOps Engineers, Cloud Architects & SREs',
        language: 'en',
        status: 'published',
      })
      .select('id')
      .single();

    if (bErr2 || !book2) {
      console.error('Error creating book 2:', bErr2);
      return;
    }

    const { data: edition2, error: eErr2 } = await client
      .from('ebook_editions')
      .insert({
        ebook_id: book2.id,
        edition_number: 1,
        version_name: 'First Edition',
        status: 'published',
        is_current_edition: true,
        price_read_online_paise: 4900,
        price_read_download_paise: 9900,
        price_upgrade_pdf_paise: 5000,
        page_count: 320,
        pdf_storage_path: 'private/sample_cloud_devops.pdf',
        pdf_checksum: 'sha256_mock_checksum_cloud_devops_1',
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (eErr2 || !edition2) {
      console.error('Error creating edition 2:', eErr2);
      return;
    }

    // Book 2 Chapter 1: Free sample
    await client.from('ebook_chapters').insert({
      ebook_id: book2.id,
      edition_id: edition2.id,
      chapter_index: 1,
      title: 'Container Orchestration & Kubernetes Primitives',
      slug: 'container-orchestration-and-kubernetes-primitives',
      content_body: `# Container Orchestration & Kubernetes Primitives

Deploying distributed microservices at enterprise scale requires declarative infrastructure management, self-healing rollouts, and automated service discovery.

## 1. Declarative Pod Topology
Kubernetes abstracts physical infrastructure behind unified APIs. Rather than manually scheduling workloads, engineering teams specify desired cluster state via YAML manifests:

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bookstore-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bookstore
  template:
    metadata:
      labels:
        app: bookstore
    spec:
      containers:
      - name: web
        image: knowledgepaat/bookstore:v1.2.0
        ports:
        - containerPort: 3000
\`\`\`

## 2. Ingress & Traffic Management
Routing external HTTP/S requests into the cluster is handled cleanly by ingress controllers providing TLS termination, rate limiting, and path-based routing.`,
      word_count: 620,
      status: 'ready',
      is_free_sample: true,
    });

    // Book 2 Chapter 2: Paid purchasers-only chapter
    await client.from('ebook_chapters').insert({
      ebook_id: book2.id,
      edition_id: edition2.id,
      chapter_index: 2,
      title: 'GitOps Workflows & Declarative Continuous Delivery',
      slug: 'gitops-workflows-and-declarative-cd',
      content_body: 'PAID PURCHASERS ONLY: Full chapter on ArgoCD, Flux, multi-environment branch promotion strategies, and secret encryption with SOPS and HashiCorp Vault.',
      word_count: 1650,
      status: 'ready',
      is_free_sample: false,
    });

    console.log('✅ Successfully seeded Book 2 in staging: Cloud System Architecture & DevOps Handbook');
  } else {
    console.log('Book 2 already exists in staging:', existing2.title);
  }
}

seed();
