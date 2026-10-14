# AI Cyber Guardian: Comprehensive Architecture Diagrams

## 1. C4 System Context Diagram

```mermaid
flowchart TD
    classDef person fill:#083f78,color:#fff,stroke:#0b5cad,stroke-width:2px;
    classDef system fill:#0b5cad,color:#fff,stroke:#083f78,stroke-width:2px;
    classDef external fill:#5b6b7c,color:#fff,stroke:#1c2530,stroke-width:2px;

    User((Legitimate Visitor)):::person
    Attacker((Threat Actor)):::person
    SecAnalyst((Security Analyst)):::person
    
    Guardian[AI Cyber Guardian SaaS\nAutonomous Threat Intelligence & Defence]:::system
    
    CustApp[Customer Web Application\nData Plane]:::external
    SIEM[Customer SIEM / SOAR]:::external
    IdP[Customer Identity Provider\nSAML / OIDC]:::external
    
    User -->|Uses| CustApp
    Attacker -->|Attacks| CustApp
    CustApp -->|Sends Metadata & Receives Decisions| Guardian
    
    SecAnalyst -->|Monitors & Configures| Guardian
    Guardian -->|Streams Events| SIEM
    Guardian -->|Authenticates via| IdP
```

## 2. C4 Container Diagram

```mermaid
flowchart TD
    classDef container fill:#438dd5,color:#fff,stroke:#083f78,stroke-width:2px;
    classDef db fill:#083f78,color:#fff,stroke:#0b5cad,stroke-width:2px;
    classDef external fill:#5b6b7c,color:#fff,stroke:#1c2530,stroke-width:2px;

    ClientSDK[Guardian SDK\nNode.js / Python]:::external
    
    subgraph ControlPlane [AI Cyber Guardian Control Plane]
        APIGW[API Gateway\nFastAPI]:::container
        RateLimiter[Rate Limiter Service\nRedis-based]:::container
        ThreatEngine[Threat Detection Engine\nRules + ML]:::container
        MgmtAPI[Management API\nFastAPI]:::container
        WebUI[Customer Dashboard\nReact SPA]:::container
        
        DB[(Primary DB\nPostgreSQL)]:::db
        Cache[(State Cache\nRedis)]:::db
        HoneypotDB[(Honeypot DB\nIsolated Postgres)]:::db
    end

    ClientSDK -->|HTTPS| APIGW
    APIGW --> RateLimiter
    RateLimiter --> ThreatEngine
    RateLimiter --> Cache
    ThreatEngine --> DB
    ThreatEngine --> HoneypotDB
    
    WebUI -->|HTTPS| MgmtAPI
    MgmtAPI --> DB
```

## 3. C4 Component Diagram (Deep Analysis Stage)

```mermaid
flowchart TD
    classDef component fill:#85bbf0,color:#000,stroke:#0b5cad,stroke-width:2px;

    APIGW[API Gateway]:::component
    
    subgraph ThreatEngine [Threat Detection Engine Container]
        FeatureExt[Feature Extractor Component\nParses headers/body]:::component
        RuleEngine[Deterministic Rule Engine\nOWASP Signatures]:::component
        IsoForest[Isolation Forest ML\nAnomaly Detection]:::component
        RandForest[Random Forest ML\nClassification]:::component
        ScoreFusion[Threat Score Fusion Component]:::component
        ActionEngine[Autonomous Action Engine]:::component
    end

    APIGW --> FeatureExt
    FeatureExt --> RuleEngine
    FeatureExt --> IsoForest
    FeatureExt --> RandForest
    
    RuleEngine --> ScoreFusion
    IsoForest --> ScoreFusion
    RandForest --> ScoreFusion
    
    ScoreFusion --> ActionEngine
```

## 4. UML Class Diagram

```mermaid
classDiagram
    class Tenant {
        +UUID id
        +String name
        +String plan_tier
        +String auth_config
    }
    class Site {
        +UUID id
        +UUID tenant_id
        +String domain
        +String status
    }
    class APIKey {
        +UUID id
        +UUID site_id
        +String hash
        +DateTime expires_at
    }
    class SecurityEvent {
        +UUID id
        +UUID site_id
        +String ip_address
        +Int threat_score
        +String action_taken
    }
    class AttackerProfile {
        +String ip_address
        +String tool_fingerprint
        +String geolocation
        +DateTime last_seen
    }
    
    Tenant "1" *-- "many" Site
    Site "1" *-- "many" APIKey
    Site "1" *-- "many" SecurityEvent
    SecurityEvent "many" --> "1" AttackerProfile
```

## 5. Sequence Diagram

```mermaid
sequenceDiagram
    participant User as Client/Attacker
    participant SDK as Guardian SDK
    participant APIGW as API Gateway
    participant RL as Rate Limiter
    participant TE as Threat Engine
    participant DB as Postgres/Redis

    User->>SDK: HTTP Request to App
    SDK->>APIGW: Async Metadata (IP, Headers, Body)
    APIGW->>RL: Check Rate Limits
    RL-->>APIGW: Pass
    APIGW->>TE: Analyze Metadata
    TE->>TE: Feature Extraction & ML Scoring
    TE->>DB: Log Security Event & Audit
    TE-->>APIGW: Decision (e.g., BLOCK)
    APIGW-->>SDK: Return BLOCK Payload
    SDK-->>User: 403 Forbidden
```

## 6. Deployment Diagram

```mermaid
flowchart TD
    classDef node fill:#eceff1,stroke:#607d8b,stroke-width:2px;
    
    subgraph Cloud [Cloud Provider Region]
        direction TB
        
        subgraph K8s [Kubernetes Cluster]
            Ingress[Nginx Ingress Controller]:::node
            PodAPI[API Gateway Pods]:::node
            PodML[Threat Engine Pods]:::node
            PodWeb[Web Dashboard Pods]:::node
        end
        
        subgraph Managed [Managed Services]
            RDS[(Managed PostgreSQL\nMulti-AZ)]:::node
            ElastiCache[(Managed Redis\nClustered)]:::node
            S3[(Object Storage)]:::node
        end
    end
    
    Internet((Internet)) --> Ingress
    Ingress --> PodAPI & PodWeb
    PodAPI --> PodML
    PodAPI --> ElastiCache
    PodML --> RDS & ElastiCache & S3
    PodWeb --> RDS
```

## 7. Entity Relationship (ER) Diagram

```mermaid
erDiagram
    TENANT ||--o{ SITE : owns
    SITE ||--o{ API_KEY : uses
    SITE ||--o{ SECURITY_EVENT : generates
    SITE ||--o{ CUSTOM_RULE : configures
    ATTACKER_PROFILE ||--o{ SECURITY_EVENT : triggers
    
    TENANT {
        uuid id PK
        string name
        string sso_provider
        datetime created_at
    }
    SITE {
        uuid id PK
        uuid tenant_id FK
        string domain_name
        string enforcement_mode
    }
    SECURITY_EVENT {
        uuid id PK
        uuid site_id FK
        string ip_address FK
        int threat_score
        string decision
    }
    ATTACKER_PROFILE {
        string ip_address PK
        string geolocation
        string fingerprint
    }
```

## 8. Data Flow Diagram (DFD)

```mermaid
flowchart TD
    Client[Client Edge]
    Process1((1.0 Ingest Metadata))
    Process2((2.0 Enforce Rate Limits))
    Process3((3.0 Score Threat))
    Process4((4.0 Execute Defence))
    
    Store1[(Tenant Config DB)]
    Store2[(Event Log DB)]
    
    Client -->|Metadata| Process1
    Process1 -->|Normalized Data| Process2
    Process2 -->|Rate Status| Process3
    Store1 -->|ML Models & Rules| Process3
    Process3 -->|Threat Score 0-100| Process4
    Process4 -->|Action Decision| Client
    Process4 -->|Audit Record| Store2
```

## 9. Network Architecture Diagram

```mermaid
flowchart TD
    subgraph PublicSubnet [Public Subnet DMZ]
        ALB[Application Load Balancer\nTLS Termination]
        NatGateway[NAT Gateway]
    end
    
    subgraph AppSubnet [Private App Subnet]
        EKS_Nodes[EKS Worker Nodes\nAPI & ML Services]
    end
    
    subgraph DataSubnet [Private Data Subnet]
        Postgres[(Postgres Primary/Replica)]
        Redis[(Redis Cluster)]
    end
    
    Internet((Internet)) -->|HTTPS :443| ALB
    ALB -->|HTTP :8080| EKS_Nodes
    EKS_Nodes -->|TCP :5432| Postgres
    EKS_Nodes -->|TCP :6379| Redis
    EKS_Nodes -->|Outbound| NatGateway
```
