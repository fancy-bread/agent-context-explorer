// Types for project state detection and parsers
import * as vscode from 'vscode';

/**
 * Represents a NuGet package reference
 */
export interface PackageReference {
	name: string;
	version?: string;
	includeAssets?: string;
	excludeAssets?: string;
}

/**
 * .NET project information
 */
export interface DotNetProjectInfo {
	targetFramework?: string;
	targetFrameworks?: string[];
	packages: PackageReference[];
	isTestProject: boolean;
	isWebProject: boolean;
	sdk?: string;
}

/**
 * Python dependency information
 */
export interface PythonDependency {
	name: string;
	version?: string;
	required?: boolean;
}

/**
 * Python project information
 */
export interface PythonProjectInfo {
	name?: string;
	version?: string;
	requiresPython?: string;
	dependencies: PythonDependency[];
	devDependencies: PythonDependency[];
	buildSystem?: string;
}

/**
 * Node.js/JavaScript project information
 */
export interface NodeProjectInfo {
	name?: string;
	version?: string;
	engines?: {
		node?: string;
		npm?: string;
	};
	frameworks: string[];
	cloudSDKs: string[];
	testingFrameworks: string[];
}

/**
 * CI/CD workflow information
 */
export interface CIWorkflowInfo {
	type: 'github-actions' | 'azure-pipelines' | 'gitlab-ci' | 'jenkins' | 'circleci';
	name: string;
	onEvents?: string[];
	environments?: string[];
	jobs?: string[];
}

/**
 * Detected technology stack
 */
export interface TechnologyStack {
	languages: string[];
	frameworks: string[];
	runtimes: string[];
	cloudProviders: string[];
}

/**
 * Parser result base interface
 */
export interface ParserResult<T> {
	success: boolean;
	data?: T;
	errors: string[];
}

/**
 * Cloud SDK patterns for detection
 */
export const CloudSDKPatterns = {
	aws: ['@aws-sdk/', 'aws-sdk'],
	azure: ['@azure/', 'azure-'],
	gcp: ['@google-cloud/', '@google/gcp', 'google-cloud-']
};

/**
 * Framework patterns for detection
 */
export const FrameworkPatterns = {
	aspnetCore: ['Microsoft.AspNetCore.', 'Microsoft.Extensions.Hosting'],
	entityFramework: ['Microsoft.EntityFrameworkCore', 'System.Data.Entity'],
	xunit: ['xunit', 'xunit.runner'],
	pytest: ['pytest', 'pytest-'],
	jest: ['jest'],
	react: ['react', 'react-dom'],
	vue: ['vue', '@vue/'],
	angular: ['@angular/'],
	express: ['express'],
	fastify: ['fastify'],
	koa: ['koa']
};

/**
 * Security-critical dependency patterns
 */
export const SecurityDependencyPatterns = {
	crypto: ['crypto', '@azure/keyvault', 'aws-kms', 'google-cloud-kms'],
	auth: ['passport', 'auth0', 'okta', 'firebase-auth', '@azure/identity'],
	encryption: ['bcrypt', 'argon2', 'pbkdf2', 'scrypt']
};

/**
 * Storage SDK patterns
 */
export const StorageSDKPatterns = {
	aws: ['aws-sdk-s3', '@aws-sdk/client-s3', '@aws-sdk/lib-storage'],
	azure: ['@azure/storage-blob', '@azure/storage-queue', '@azure/storage-file-share'],
	gcp: ['@google-cloud/storage', '@google-cloud/datastore'],
	postgres: ['pg', 'postgres', 'pg-promise', 'sequelize', 'prisma'],
	mysql: ['mysql', 'mysql2', 'mariadb', 'sequelize'],
	mongodb: ['mongodb', 'mongoose', '@azure/cosmos'],
	redis: ['redis', 'ioredis', '@azure/redis-cache']
};

/**
 * Testing infrastructure patterns
 */
export const TestInfrastructurePatterns = {
	testcontainers: ['testcontainers', 'testcontainers-'],
	localstack: ['localstack', 'moto'],
	azurite: ['azurite', 'azure-storage'],
	wiremock: ['wiremock', 'nock']
};

/**
 * Code quality tool patterns
 */
export const CodeQualityPatterns = {
	linters: {
		stylecop: ['StyleCop.Analyzers', 'StyleCop', 'Ruleset'],
		eslint: ['eslint', '.eslintrc'],
		pylint: ['pylint', '.pylintrc'],
		ruff: ['ruff']
	},
	formatters: {
		'dotnet-format': ['dotnet-format'],
		black: ['black'],
		prettier: ['prettier', '.prettierrc']
	},
	typeCheckers: {
		pyright: ['pyright'],
		mypy: ['mypy'],
		tsc: ['typescript']
	}
};

/**
 * Enhanced project state - extends basic state with additional detection categories
 */
export interface InfrastructureInfo {
	databases: string[];
	cache: string[];
	queues: string[];
	storage: string[];
	messaging: string[];
}

export interface SecurityInfo {
	authFrameworks: string[];
	encryption: string[];
	vulnerabilityScanning: string[];
	secretsManagement: string[];
}

export interface APIInfo {
	type: string[];
	documentation: string[];
	authentication: string[];
	versioning: string[];
}

export interface DeploymentInfo {
	environments: string[];
	platforms: string[];
	orchestration: string[];
}

export interface ProjectMetrics {
	estimatedSize: 'small' | 'medium' | 'large';
	complexity: 'low' | 'medium' | 'high';
	filesAnalyzed: number;
	lastAnalyzed: string;
}

/**
 * Database detection patterns
 */
export const DatabasePatterns = {
	postgres: ['pg', 'postgres', 'pg-promise', 'postgresql', 'psycopg2', 'asyncpg'],
	mysql: ['mysql', 'mysql2', 'mariadb', 'pymysql', 'mysqlclient'],
	mongodb: ['mongodb', 'mongoose', '@azure/cosmos', 'pymongo', 'motor'],
	redis: ['redis', 'ioredis', '@azure/redis-cache', 'redis-py', 'aioredis'],
	sqlite: ['sqlite', 'sqlite3', 'better-sqlite3'],
	sqlserver: ['mssql', 'tedious', 'pyodbc', 'pymssql'],
	oracle: ['oracledb', 'cx_oracle'],
	cassandra: ['cassandra-driver', 'cassandra'],
	elasticsearch: ['@elastic/elasticsearch', 'elasticsearch'],
	dynamodb: ['@aws-sdk/client-dynamodb', 'dynamodb', 'boto3']
};

/**
 * ORM patterns
 */
export const ORMPatterns = {
	prisma: ['prisma', '@prisma/client'],
	sequelize: ['sequelize'],
	typeorm: ['typeorm'],
	mongoose: ['mongoose'],
	sqlalchemy: ['sqlalchemy'],
	django: ['django'],
	hibernate: ['hibernate']
};

/**
 * Queue/Messaging patterns
 */
export const QueuePatterns = {
	rabbitmq: ['amqplib', 'rabbitmq', 'pika', 'aio-pika'],
	kafka: ['kafkajs', 'kafka-python', 'confluent-kafka'],
	sqs: ['@aws-sdk/client-sqs', 'boto3'],
	azureServiceBus: ['@azure/service-bus'],
	googlePubSub: ['@google-cloud/pubsub'],
	redis: ['bull', 'bee-queue', 'rq', 'celery']
};

/**
 * API patterns
 */
export const APIPatterns = {
	rest: ['express', 'fastify', 'koa', 'flask', 'fastapi', 'django-rest-framework'],
	graphql: ['graphql', 'apollo-server', 'apollo-client', 'graphene', '@nestjs/graphql'],
	grpc: ['@grpc/grpc-js', 'grpc', 'grpcio'],
	websocket: ['ws', 'socket.io', 'websockets', 'socketio'],
	swagger: ['swagger-ui', 'swagger-jsdoc', '@nestjs/swagger', 'drf-yasg'],
	openapi: ['openapi', '@openapi-generator']
};

/**
 * Authentication patterns
 */
export const AuthPatterns = {
	jwt: ['jsonwebtoken', 'pyjwt', 'jose'],
	oauth: ['passport-oauth', 'authlib', 'oauth2client'],
	passport: ['passport'],
	auth0: ['auth0', '@auth0/'],
	okta: ['@okta/'],
	firebase: ['firebase-auth', 'firebase-admin'],
	cognito: ['@aws-sdk/client-cognito', 'boto3']
};

/**
 * Vulnerability scanning patterns
 */
export const VulnerabilityScanningPatterns = {
	snyk: ['snyk'],
	dependabot: ['dependabot'],
	npm: ['npm audit'],
	pip: ['safety', 'pip-audit'],
	trivy: ['trivy'],
	sonarqube: ['sonarqube', 'sonar-scanner']
};

/**
 * Secrets management patterns
 */
export const SecretsPatterns = {
	vault: ['vault', '@azure/keyvault'],
	dotenv: ['.env', 'dotenv', 'python-dotenv'],
	awsSecrets: ['@aws-sdk/client-secrets-manager'],
	gcpSecrets: ['@google-cloud/secret-manager']
};

/**
 * Container orchestration patterns
 */
export const OrchestrationPatterns = {
	kubernetes: ['kubernetes', 'kubectl', 'k8s'],
	docker: ['docker', 'dockerfile', 'docker-compose'],
	helm: ['helm'],
	nomad: ['nomad'],
	ecs: ['ecs', '@aws-sdk/client-ecs'],
	aks: ['@azure/arm-containerservice'],
	gke: ['@google-cloud/container']
};

// =============================================================================
// ASDLC Artifact Types
// =============================================================================

/**
 * Section parsed from AGENTS.md
 */
export interface AgentsMdSection {
	level: number;
	title: string;
	startLine: number;
	endLine: number;
}

/**
 * Tech stack information from AGENTS.md
 */
export interface TechStackInfo {
	languages: string[];
	frameworks: string[];
	buildTools: string[];
	testing: string[];
	packageManager?: string;
}

/**
 * Operational boundaries from AGENTS.md (3-tier system)
 */
export interface OperationalBoundaries {
	tier1Always: string[];  // Non-negotiable standards
	tier2Ask: string[];     // High-risk operations requiring approval
	tier3Never: string[];   // Safety limits - forbidden actions
}

/**
 * AGENTS.md file information
 */
export interface AgentsMdInfo {
	exists: boolean;
	path?: string;
	mission?: string;
	corePhilosophy?: string;
	sections: AgentsMdSection[];
	techStack?: TechStackInfo;
	operationalBoundaries?: OperationalBoundaries;
}

/**
 * Individual spec file information
 */
export interface SpecFile {
	domain: string;       // e.g., "user-authentication", "scanners"
	path: string;
	hasBlueprint: boolean;
	hasContract: boolean;
	lastModified?: string;
}

/**
 * specs/ directory information
 */
export interface SpecsInfo {
	exists: boolean;
	path?: string;
	specs: SpecFile[];
}

/**
 * Individual schema file information
 */
export interface SchemaFile {
	name: string;
	path: string;
	schemaId?: string;  // $id from JSON Schema
}

/**
 * schemas/ directory information
 */
export interface SchemasInfo {
	exists: boolean;
	path?: string;
	schemas: SchemaFile[];
}

/**
 * Combined ASDLC artifacts scanning result
 */
export interface AsdlcArtifacts {
	agentsMd: AgentsMdInfo;
	specs: SpecsInfo;
	schemas: SchemasInfo;
	hasAnyArtifacts: boolean;
}

// =============================================================================
// ASDLC Compliance Types
// =============================================================================

/**
 * Status for a compliance check
 */
export type ComplianceStatus = 'pass' | 'fail' | 'warn';

/**
 * Individual compliance check result
 */
export interface PillarCheck {
	name: string;
	status: ComplianceStatus;
	message: string;
	details?: string[];
}

/**
 * ASDLC pillar identifiers
 */
export type PillarName = 'factory-architecture' | 'standardized-parts' | 'quality-control';

/**
 * Result for a single ASDLC pillar validation
 */
export interface PillarResult {
	pillar: PillarName;
	status: ComplianceStatus;
	checks: PillarCheck[];
	summary: string;
}

/**
 * Full ASDLC compliance report
 */
export interface ComplianceReport {
	timestamp: string;
	projectPath: string;
	overallStatus: ComplianceStatus;
	pillars: PillarResult[];
	recommendations: string[];
}
